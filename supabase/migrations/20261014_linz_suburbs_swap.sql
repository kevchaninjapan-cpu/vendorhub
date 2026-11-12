-- ============================================================================
-- LINZ suburbs - SWAP (live change, runs as one transaction)
--
-- Run only after the loader report has passed. If any statement fails, the
-- SQL Editor rolls back the whole script and nothing changes.
--
--   * archives the 7,460 street rows to archive_suburbs_streets
--   * loads the LINZ suburbs with region, district and boundaries
--   * adds listings.suburb_id, set from each listing's map position
--   * keeps it set for new listings with a trigger
--   * repoints recount_active_listings and marketplace_suburb_summary
--   * drops upsert_suburb, the function the street names came in through
--
-- Listing text (suburb, region) is NOT changed, so no listing URL changes.
-- median_sale_price starts empty: it held median DVR capital values for the
-- old street rows, which do not carry over to real suburbs.
-- ============================================================================

-- ---- Guards ----------------------------------------------------------------
do $$
declare
  v_rows     integer;
  v_unmapped integer;
begin
  if to_regclass('public.archive_suburbs_streets') is not null then
    raise exception 'The swap has already been run (archive_suburbs_streets exists). Nothing changed.';
  end if;

  select count(*) into v_rows from linz_suburbs_staging where geom is not null;
  if v_rows < 6000 then
    raise exception 'Only % suburbs with geometry in the holding table; expected about 6,500. Re-run the loader. Nothing changed.', v_rows;
  end if;

  select count(*) into v_unmapped
  from linz_suburbs_staging s
  where trim(split_part(coalesce(s.ta_ascii, ''), ',', 1)) <> ''
    and lower(trim(split_part(s.ta_ascii, ',', 1))) not like 'area outside%'
    and not exists (select 1 from nz_ta_regions r
                    where lower(r.ta_ascii) = lower(trim(split_part(s.ta_ascii, ',', 1))));
  if v_unmapped > 0 then
    raise exception '% suburbs have a council with no region mapping. See the loader report. Nothing changed.', v_unmapped;
  end if;
end $$;

-- ---- Fix axis order if the download came back as lat/lon --------------------
-- Latitude can never exceed 90, so a |Y| over 90 means the axes are swapped.
update linz_suburbs_staging
set geom = ST_FlipCoordinates(geom)
where geom is not null
  and abs(ST_Y(ST_PointOnSurface(geom))) > 90;

-- ---- Regions missing from the regions table ------------------------------
insert into public.regions (slug, name, sort_order, is_active)
values ('chatham-islands', 'Chatham Islands', 17, false)
on conflict do nothing;

-- ---- New columns -------------------------------------------------------------
alter table public.suburbs add column if not exists district    text;
alter table public.suburbs add column if not exists region_slug text;
alter table public.suburbs add column if not exists linz_id     bigint;
alter table public.suburbs add column if not exists population  integer;

-- ---- Archive and clear the street rows ---------------------------------------
create table public.archive_suburbs_streets as select * from public.suburbs;
alter table public.archive_suburbs_streets enable row level security;

-- Real suburb names repeat within a region (e.g. two Arkles Bay in Auckland).
-- Slugs keep them distinct, so the old (region, name) rule is removed.
alter table public.suburbs drop constraint if exists suburbs_region_name_key;
drop index if exists public.suburbs_region_name_key;

delete from public.suburbs;

-- ---- Load LINZ suburbs -------------------------------------------------------
-- Slug keeps the existing "<region>-<name>" pattern. Where a name repeats in
-- a region (e.g. several "Riverside"), the town is appended; if it still
-- repeats, the LINZ id is appended.
insert into public.suburbs (
  id, name, region, slug, geom, median_sale_price, active_listings_count,
  updated_at, district, region_slug, linz_id, population
)
with base as (
  select
    s.linz_id,
    s.name,
    r.region,
    r.region_slug,
    trim(split_part(coalesce(s.ta, s.ta_ascii), ',', 1)) as district,
    s.population,
    s.geom,
    trim(both '-' from regexp_replace(lower(coalesce(s.name_ascii, s.name)), '[^a-z0-9]+', '-', 'g')) as name_slug,
    nullif(trim(both '-' from regexp_replace(lower(coalesce(s.major_name_ascii, s.major_name, '')), '[^a-z0-9]+', '-', 'g')), '') as major_slug
  from linz_suburbs_staging s
  join nz_ta_regions r
    on lower(r.ta_ascii) = lower(trim(split_part(coalesce(s.ta_ascii, ''), ',', 1)))
  where s.geom is not null
    and coalesce(s.locality_type, '') <> 'Coastal Bay'
),
pass1 as (
  select b.*,
         b.region_slug || '-' || b.name_slug as slug1,
         count(*) over (partition by b.region_slug, b.name_slug) as dup1
  from base b
),
pass2 as (
  select p.*,
         case when p.dup1 > 1 then concat_ws('-', p.slug1, p.major_slug) else p.slug1 end as slug2
  from pass1 p
),
pass3 as (
  select p.*, count(*) over (partition by p.slug2) as dup2
  from pass2 p
)
select
  gen_random_uuid(),
  name,
  region,
  case when dup2 > 1 then slug2 || '-' || linz_id::text else slug2 end,
  geom::geography,
  null,
  0,
  now(),
  district,
  region_slug,
  linz_id,
  population
from pass3;

create index if not exists idx_suburbs_geom        on public.suburbs using gist (geom);
create index if not exists idx_suburbs_region_slug on public.suburbs (region_slug);
create index if not exists idx_suburbs_linz_id     on public.suburbs (linz_id);

-- ---- Link listings to suburbs ------------------------------------------------
alter table public.listings
  add column if not exists suburb_id uuid references public.suburbs (id) on delete set null;

create index if not exists idx_listings_suburb_id on public.listings (suburb_id);

-- By map position first. Where boundaries overlap, the larger suburb wins.
update public.listings l
set suburb_id = (
  select s.id from public.suburbs s
  where ST_Covers(s.geom, l.geom::geography)
  order by s.population desc nulls last
  limit 1
)
where l.geom is not null;

-- Fallback by name and region for listings with no map position.
update public.listings l
set suburb_id = (
  select s.id from public.suburbs s
  where lower(s.name) = lower(l.suburb)
    and lower(s.region) = lower(coalesce(l.region, ''))
  order by s.population desc nulls last
  limit 1
)
where l.suburb_id is null and l.suburb is not null;

-- Keep suburb_id right for new and edited listings. Only suburb_id is set;
-- the listing's own suburb and region text are left alone.
create or replace function public.set_listing_suburb_id()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $function$
begin
  new.suburb_id := null;

  if new.geom is not null then
    select s.id into new.suburb_id
    from suburbs s
    where ST_Covers(s.geom, new.geom::geography)
    order by s.population desc nulls last
    limit 1;
  end if;

  if new.suburb_id is null and new.suburb is not null then
    select s.id into new.suburb_id
    from suburbs s
    where lower(s.name) = lower(new.suburb)
      and lower(s.region) = lower(coalesce(new.region, ''))
    order by s.population desc nulls last
    limit 1;
  end if;

  return new;
end $function$;

drop trigger if exists trg_listings_set_suburb_id on public.listings;
create trigger trg_listings_set_suburb_id
  before insert or update of geom, suburb, region on public.listings
  for each row execute function public.set_listing_suburb_id();

-- ---- Repoint the existing functions ------------------------------------------
create or replace function public.recount_active_listings()
returns void
language sql
security definer
set search_path = public
as $function$
  update suburbs s
  set active_listings_count = c.n
  from (
    select s2.id, count(l.id)::integer as n
    from suburbs s2
    left join listings l
      on l.suburb_id = s2.id
     and l.status in ('live', 'under_offer')
    group by s2.id
  ) c
  where c.id = s.id
    and s.active_listings_count is distinct from c.n;
$function$;

revoke execute on function public.recount_active_listings() from public, anon, authenticated;
grant  execute on function public.recount_active_listings() to service_role;

create or replace function public.marketplace_suburb_summary(p_slug text)
returns table (
  id uuid,
  name text,
  region text,
  slug text,
  median_sale_price numeric,
  active_listings_count integer,
  live_listings_count bigint
)
language sql
stable
as $function$
  select
    s.id, s.name, s.region, s.slug, s.median_sale_price, s.active_listings_count,
    (
      select count(*)::bigint
      from listings l
      where l.status in ('live', 'under_offer')
        and (
          l.suburb_id = s.id
          or (l.suburb_id is null
              and lower(l.suburb) = lower(s.name)
              and lower(coalesce(l.region, '')) = lower(s.region))
        )
    ) as live_listings_count
  from suburbs s
  where s.slug = p_slug;
$function$;

-- The street names came in through this function. Remove every version.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'upsert_suburb'
  loop
    execute 'drop function ' || r.sig;
  end loop;
end $$;

select public.recount_active_listings();

notify pgrst, 'reload schema';

-- ---- Result (this is the row the SQL Editor shows) ---------------------------
select
  (select count(distinct region) from public.suburbs)                    as regions,
  (select count(*) from public.suburbs)                                   as suburbs,
  (select count(*) from public.archive_suburbs_streets)                   as archived_street_rows,
  (select count(*) from public.listings where suburb_id is not null)      as listings_matched,
  (select count(*) from public.listings)                                  as listings_total;