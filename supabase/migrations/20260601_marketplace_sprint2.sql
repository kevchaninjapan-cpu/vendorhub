-- ============================================================================
-- VendorHub Marketplace — Sprint 2 helpers (idempotent)
-- Adds:
--   * marketplace_search_in_bbox()   — geo + facet search RPC
--   * marketplace_listing_by_slug()  — single listing lookup
--   * marketplace_suburb_summary()   — suburb aggregates for landing pages
--   * Auto-refresh of listings_search on insert/update/delete
-- ============================================================================

-- ── Auto-refresh trigger for the materialised view ────────────────────────
drop function if exists refresh_listings_search_async() cascade;
create function refresh_listings_search_async() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    refresh materialized view concurrently listings_search;
  exception when others then
    refresh materialized view listings_search;
  end;
  return null;
end $$;

drop trigger if exists trg_refresh_listings_search on listings;
create trigger trg_refresh_listings_search
  after insert or update of status, published_at, headline, description, suburb,
        bedrooms, bathrooms, asking_price, pack_tier
  or delete on listings
  for each statement execute function refresh_listings_search_async();

-- ── Faceted geo search RPC ────────────────────────────────────────────────
drop function if exists marketplace_search_in_bbox(
  numeric, numeric, numeric, numeric,
  text, text, integer, integer,
  numeric, numeric, integer, integer,
  text, boolean, text, integer, integer
) cascade;

create function marketplace_search_in_bbox(
  p_min_lng numeric default null,
  p_min_lat numeric default null,
  p_max_lng numeric default null,
  p_max_lat numeric default null,
  p_search text default null,
  p_suburb text default null,
  p_min_beds integer default null,
  p_min_baths integer default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_min_floor integer default null,
  p_min_land integer default null,
  p_property_type text default null,
  p_ready_to_buy boolean default null,
  p_sort text default 'best',
  p_limit integer default 24,
  p_offset integer default 0
) returns table (
  id uuid,
  short_id text,
  slug text,
  status text,
  pack_tier text,
  search_rank_boost numeric,
  formatted_address text,
  street_address text,
  suburb text,
  region text,
  postcode text,
  lng double precision,
  lat double precision,
  property_type text,
  bedrooms integer,
  bathrooms integer,
  parking integer,
  floor_area_sqm numeric,
  land_area_sqm numeric,
  year_built integer,
  method_of_sale text,
  asking_price numeric,
  price_text text,
  valuation_estimate numeric,
  ready_to_buy boolean,
  published_at timestamptz,
  cover_url text,
  match_rank real,
  total_count bigint
)
language plpgsql stable as $$
declare
  v_bbox geography;
  v_tsq tsquery;
begin
  if p_min_lng is not null and p_min_lat is not null
     and p_max_lng is not null and p_max_lat is not null then
    v_bbox := ST_MakeEnvelope(
      p_min_lng::float, p_min_lat::float,
      p_max_lng::float, p_max_lat::float, 4326
    )::geography;
  end if;

  if p_search is not null and length(trim(p_search)) > 0 then
    v_tsq := plainto_tsquery('english', p_search);
  end if;

  return query
  with filtered as (
    select
      ls.*,
      ST_X(ls.geom::geometry) as lng,
      ST_Y(ls.geom::geometry) as lat,
      case when v_tsq is null then 0
           else ts_rank(ls.search_doc, v_tsq) end as match_rank,
      (
        select lm.public_url
        from listing_media lm
        where lm.listing_id = ls.id and lm.is_cover
        limit 1
      ) as cover_url
    from listings_search ls
    where (v_bbox is null or ST_Intersects(ls.geom, v_bbox))
      and (v_tsq is null or ls.search_doc @@ v_tsq)
      and (p_suburb is null or lower(ls.suburb) = lower(p_suburb))
      and (p_min_beds is null or ls.bedrooms >= p_min_beds)
      and (p_min_baths is null or ls.bathrooms >= p_min_baths)
      and (p_min_price is null or coalesce(ls.asking_price, 0) >= p_min_price)
      and (p_max_price is null or coalesce(ls.asking_price, p_max_price) <= p_max_price)
      and (p_min_floor is null or coalesce(ls.floor_area_sqm, 0) >= p_min_floor)
      and (p_min_land is null or coalesce(ls.land_area_sqm, 0) >= p_min_land)
      and (p_property_type is null or ls.property_type::text = p_property_type)
      and (p_ready_to_buy is null or ls.ready_to_buy = p_ready_to_buy)
  ),
  counted as (
    select count(*)::bigint as n from filtered
  )
  select
    f.id, f.short_id, f.slug, f.status::text, f.pack_tier::text,
    f.search_rank_boost,
    f.formatted_address, f.street_address, f.suburb, f.region, f.postcode,
    f.lng, f.lat,
    f.property_type::text,
    f.bedrooms, f.bathrooms, f.parking,
    f.floor_area_sqm, f.land_area_sqm, f.year_built,
    f.method_of_sale::text,
    f.asking_price, f.price_text, f.valuation_estimate,
    f.ready_to_buy, f.published_at,
    f.cover_url,
    f.match_rank,
    counted.n as total_count
  from filtered f, counted
  order by
    case when p_sort = 'price_asc'  then f.asking_price end asc nulls last,
    case when p_sort = 'price_desc' then f.asking_price end desc nulls last,
    case when p_sort = 'newest'     then f.published_at end desc nulls last,
    case when p_sort = 'best' or p_sort is null
         then f.search_rank_boost * (
           coalesce(f.match_rank, 0) +
           greatest(0, 1 - extract(epoch from (now() - f.published_at)) / (86400 * 30))
         )
    end desc nulls last
  limit p_limit
  offset p_offset;
end $$;

grant execute on function marketplace_search_in_bbox(
  numeric, numeric, numeric, numeric,
  text, text, integer, integer,
  numeric, numeric, integer, integer,
  text, boolean, text, integer, integer
) to anon, authenticated;

-- ── Lookup a listing by slug (public read) ────────────────────────────────
drop function if exists marketplace_listing_by_slug(text) cascade;
create function marketplace_listing_by_slug(p_slug text)
returns table (
  id uuid,
  short_id text,
  slug text,
  status text,
  pack_tier text,
  member_id uuid,
  formatted_address text,
  street_address text,
  suburb text,
  region text,
  postcode text,
  display_address_masked boolean,
  lng double precision,
  lat double precision,
  property_type text,
  bedrooms integer,
  bathrooms integer,
  parking integer,
  floor_area_sqm numeric,
  land_area_sqm numeric,
  year_built integer,
  chattels text[],
  headline text,
  description text,
  method_of_sale text,
  asking_price numeric,
  price_text text,
  tender_close_at timestamptz,
  beo_amount numeric,
  valuation_estimate numeric,
  valuation_low numeric,
  valuation_high numeric,
  valuation_confidence numeric,
  ready_to_buy boolean,
  disclosures jsonb,
  published_at timestamptz
)
language sql stable as $$
  select
    l.id, l.short_id, l.slug, l.status::text, l.pack_tier::text, l.member_id,
    l.formatted_address, l.street_address, l.suburb, l.region, l.postcode,
    l.display_address_masked,
    ST_X(l.geom::geometry) as lng,
    ST_Y(l.geom::geometry) as lat,
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
    and l.status in ('live','under_offer');
$$;

grant execute on function marketplace_listing_by_slug(text) to anon, authenticated;

-- ── Suburb summary for landing pages ──────────────────────────────────────
drop function if exists marketplace_suburb_summary(text) cascade;
create function marketplace_suburb_summary(p_slug text)
returns table (
  id uuid,
  name text,
  region text,
  slug text,
  median_sale_price numeric,
  active_listings_count integer,
  live_listings_count bigint
)
language sql stable as $$
  select
    s.id, s.name, s.region, s.slug, s.median_sale_price, s.active_listings_count,
    (
      select count(*)::bigint
      from listings l
      where lower(l.suburb) = lower(s.name)
        and l.status in ('live','under_offer')
    ) as live_listings_count
  from suburbs s
  where s.slug = p_slug;
$$;

grant execute on function marketplace_suburb_summary(text) to anon, authenticated;