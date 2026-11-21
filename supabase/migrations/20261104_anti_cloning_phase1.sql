-- ============================================================================
-- Anti-cloning phase 1 - safe to run straight away
-- ============================================================================

-- ---- Rate limit counters (server only) --------------------------------------
create table if not exists public.rate_limits (
  bucket       text not null,
  subject      text not null,
  window_start timestamptz not null,
  hits         integer not null default 0,
  primary key (bucket, subject, window_start)
);

alter table public.rate_limits enable row level security;
revoke all on table public.rate_limits from anon, authenticated;

create or replace function public.hit_rate_limit(
  p_bucket text, p_subject text, p_limit integer, p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits  integer;
begin
  insert into rate_limits (bucket, subject, window_start, hits)
  values (p_bucket, p_subject, v_start, 1)
  on conflict (bucket, subject, window_start)
  do update set hits = rate_limits.hits + 1
  returning hits into v_hits;

  if random() < 0.01 then
    delete from rate_limits where window_start < now() - interval '2 days';
  end if;

  return v_hits <= p_limit;
end $function$;

revoke execute on function public.hit_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant  execute on function public.hit_rate_limit(text, text, integer, integer) to service_role;

-- ---- Map positions: drafts were readable, masked addresses were exact -------
-- Before: any listing id returned its exact location, including drafts.
-- Now: live listings only, and listings with a masked address return a
-- position rounded to about 100 m.
create or replace function public.marketplace_listings_geom(p_ids uuid[])
returns table (id uuid, lng double precision, lat double precision)
language sql
stable
security definer
set search_path = public
as $function$
  select
    l.id,
    case when coalesce(l.display_address_masked, false)
         then round(ST_X(l.geom::geometry)::numeric, 3)::double precision
         else ST_X(l.geom::geometry) end,
    case when coalesce(l.display_address_masked, false)
         then round(ST_Y(l.geom::geometry)::numeric, 3)::double precision
         else ST_Y(l.geom::geometry) end
  from listings l
  where l.id = any(p_ids)
    and l.geom is not null
    and l.status in ('live', 'under_offer');
$function$;

-- Listing page: same masking for the address and position.
create or replace function public.marketplace_listing_by_slug(p_slug text)
returns table (
  id uuid, short_id text, slug text, status text, pack_tier text, member_id uuid,
  formatted_address text, street_address text, suburb text, region text, postcode text,
  display_address_masked boolean, lng double precision, lat double precision,
  property_type text, bedrooms integer, bathrooms integer, parking integer,
  floor_area_sqm numeric, land_area_sqm numeric, year_built integer,
  chattels text[], headline text, description text, method_of_sale text,
  asking_price numeric, price_text text, tender_close_at timestamptz, beo_amount numeric,
  valuation_estimate numeric, valuation_low numeric, valuation_high numeric,
  valuation_confidence numeric, ready_to_buy boolean, disclosures jsonb, published_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $function$
  select
    l.id, l.short_id, l.slug, l.status::text, l.pack_tier::text, l.member_id,
    case when coalesce(l.display_address_masked, false)
         then concat_ws(', ', l.suburb, l.region) else l.formatted_address end,
    case when coalesce(l.display_address_masked, false) then null else l.street_address end,
    l.suburb, l.region, l.postcode,
    l.display_address_masked,
    case when coalesce(l.display_address_masked, false)
         then round(ST_X(l.geom::geometry)::numeric, 3)::double precision
         else ST_X(l.geom::geometry) end,
    case when coalesce(l.display_address_masked, false)
         then round(ST_Y(l.geom::geometry)::numeric, 3)::double precision
         else ST_Y(l.geom::geometry) end,
    l.property_type::text,
    l.bedrooms, l.bathrooms, l.parking,
    l.floor_area_sqm, l.land_area_sqm, l.year_built,
    l.chattels, l.headline, l.description,
    l.method_of_sale::text,
    l.asking_price, l.price_text, l.tender_close_at, l.beo_amount,
    l.valuation_estimate, l.valuation_low, l.valuation_high, l.valuation_confidence,
    l.ready_to_buy, l.disclosures, l.published_at
  from listings l
  where l.slug = p_slug
    and l.status in ('live', 'under_offer');
$function$;

-- ---- Fake listing views ------------------------------------------------------
-- Anyone could insert views directly. Views are now recorded by the server.
drop policy if exists views_insert on public.listing_views;
revoke insert, update, delete on table public.listing_views from anon, authenticated;

-- ---- Photo bucket: stop public listing of every file ------------------------
-- Photos still load from their public links. Only the owner can list their
-- own folder (needed for deleting photos).
drop policy if exists "listing-media public read" on storage.objects;
drop policy if exists "listing-media owner read" on storage.objects;
create policy "listing-media owner read" on storage.objects
  for select
  using (bucket_id = 'listing-media' and auth.uid()::text = (storage.foldername(name))[1]);

-- ---- Tables no visitor needs at all -----------------------------------------
-- These already returned no rows to the public (no read rule). Removing the
-- permission as well means a future mistaken rule can't open them.
do $$
declare
  t text;
begin
  foreach t in array array[
    'nz_akl_rate_assessment', 'nz_address_property_map', 'nz_addresses',
    'nz_property_boundaries', 'school_zones', 'linz_suburbs_staging',
    'archive_suburbs_streets', 'nz_ta_regions', 'audit_log', 'nz_dvr_114085'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('revoke all on table public.%I from anon, authenticated', t);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';