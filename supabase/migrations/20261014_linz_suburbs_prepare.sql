-- ============================================================================
-- LINZ suburbs - PREPARE (safe: adds tables and loader functions only)
--
-- Defect 7: the live `suburbs` table holds 7,460 STREET names, all with
-- region = 'Auckland' and no geometry. They came from scripts/seed-suburbs.ts,
-- which grouped DVR situation_name (a street address) as if it were a suburb.
--
-- This file stages the LINZ "NZ Suburbs and Localities" layer (113764) so it
-- can be checked before anything live changes. The swap is a separate file.
-- ============================================================================

create extension if not exists postgis;

-- Territorial authority -> region lookup (region -> district -> suburb).
-- Councils that span regions are assigned to the region holding most of
-- their population (Taupo -> Waikato, Rotorua -> Bay of Plenty,
-- Waitaki -> Otago, Stratford -> Taranaki, etc).
create table if not exists public.nz_ta_regions (
  ta_ascii    text primary key,
  region      text not null,
  region_slug text not null
);

alter table public.nz_ta_regions enable row level security;

insert into public.nz_ta_regions (ta_ascii, region, region_slug) values
  ('Far North District',              'Northland', 'northland'),
  ('Whangarei District',              'Northland', 'northland'),
  ('Kaipara District',                'Northland', 'northland'),
  ('Auckland',                        'Auckland', 'auckland'),
  ('Thames-Coromandel District',      'Waikato', 'waikato'),
  ('Hauraki District',                'Waikato', 'waikato'),
  ('Waikato District',                'Waikato', 'waikato'),
  ('Matamata-Piako District',         'Waikato', 'waikato'),
  ('Hamilton City',                   'Waikato', 'waikato'),
  ('Waipa District',                  'Waikato', 'waikato'),
  ('Otorohanga District',             'Waikato', 'waikato'),
  ('South Waikato District',          'Waikato', 'waikato'),
  ('Waitomo District',                'Waikato', 'waikato'),
  ('Taupo District',                  'Waikato', 'waikato'),
  ('Western Bay of Plenty District',  'Bay of Plenty', 'bay-of-plenty'),
  ('Tauranga City',                   'Bay of Plenty', 'bay-of-plenty'),
  ('Rotorua District',                'Bay of Plenty', 'bay-of-plenty'),
  ('Whakatane District',              'Bay of Plenty', 'bay-of-plenty'),
  ('Kawerau District',                'Bay of Plenty', 'bay-of-plenty'),
  ('Opotiki District',                'Bay of Plenty', 'bay-of-plenty'),
  ('Gisborne District',               'Gisborne', 'gisborne'),
  ('Wairoa District',                 'Hawke''s Bay', 'hawkes-bay'),
  ('Hastings District',               'Hawke''s Bay', 'hawkes-bay'),
  ('Napier City',                     'Hawke''s Bay', 'hawkes-bay'),
  ('Central Hawke''s Bay District',   'Hawke''s Bay', 'hawkes-bay'),
  ('New Plymouth District',           'Taranaki', 'taranaki'),
  ('Stratford District',              'Taranaki', 'taranaki'),
  ('South Taranaki District',         'Taranaki', 'taranaki'),
  ('Ruapehu District',                U&'Manawat\016B-Whanganui', 'manawatu-whanganui'),
  ('Whanganui District',              U&'Manawat\016B-Whanganui', 'manawatu-whanganui'),
  ('Wanganui District',               U&'Manawat\016B-Whanganui', 'manawatu-whanganui'),
  ('Rangitikei District',             U&'Manawat\016B-Whanganui', 'manawatu-whanganui'),
  ('Manawatu District',               U&'Manawat\016B-Whanganui', 'manawatu-whanganui'),
  ('Palmerston North City',           U&'Manawat\016B-Whanganui', 'manawatu-whanganui'),
  ('Tararua District',                U&'Manawat\016B-Whanganui', 'manawatu-whanganui'),
  ('Horowhenua District',             U&'Manawat\016B-Whanganui', 'manawatu-whanganui'),
  ('Kapiti Coast District',           'Wellington', 'wellington'),
  ('Porirua City',                    'Wellington', 'wellington'),
  ('Upper Hutt City',                 'Wellington', 'wellington'),
  ('Lower Hutt City',                 'Wellington', 'wellington'),
  ('Hutt City',                       'Wellington', 'wellington'),
  ('Wellington City',                 'Wellington', 'wellington'),
  ('Masterton District',              'Wellington', 'wellington'),
  ('Carterton District',              'Wellington', 'wellington'),
  ('South Wairarapa District',        'Wellington', 'wellington'),
  ('Tasman District',                 'Tasman', 'tasman'),
  ('Nelson City',                     'Nelson', 'nelson'),
  ('Marlborough District',            'Marlborough', 'marlborough'),
  ('Buller District',                 'West Coast', 'west-coast'),
  ('Grey District',                   'West Coast', 'west-coast'),
  ('Westland District',               'West Coast', 'west-coast'),
  ('Kaikoura District',               'Canterbury', 'canterbury'),
  ('Hurunui District',                'Canterbury', 'canterbury'),
  ('Waimakariri District',            'Canterbury', 'canterbury'),
  ('Christchurch City',               'Canterbury', 'canterbury'),
  ('Selwyn District',                 'Canterbury', 'canterbury'),
  ('Ashburton District',              'Canterbury', 'canterbury'),
  ('Timaru District',                 'Canterbury', 'canterbury'),
  ('Mackenzie District',              'Canterbury', 'canterbury'),
  ('Waimate District',                'Canterbury', 'canterbury'),
  ('Chatham Islands Territory',       'Chatham Islands', 'chatham-islands'),
  ('Waitaki District',                'Otago', 'otago'),
  ('Central Otago District',          'Otago', 'otago'),
  ('Queenstown-Lakes District',       'Otago', 'otago'),
  ('Dunedin City',                    'Otago', 'otago'),
  ('Clutha District',                 'Otago', 'otago'),
  ('Southland District',              'Southland', 'southland'),
  ('Gore District',                   'Southland', 'southland'),
  ('Invercargill City',               'Southland', 'southland')
on conflict (ta_ascii) do update
  set region = excluded.region, region_slug = excluded.region_slug;

-- Holding table for the raw LINZ rows. Nothing reads this but the swap.
create table if not exists public.linz_suburbs_staging (
  linz_id          bigint primary key,
  name             text not null,
  name_ascii       text,
  major_name       text,
  major_name_ascii text,
  ta               text,
  ta_ascii         text,
  locality_type    text,
  population       integer,
  geom             geometry,
  loaded_at        timestamptz not null default now()
);

alter table public.linz_suburbs_staging enable row level security;

-- Loads one page of LINZ GeoJSON. Called by the PowerShell loader with the
-- service role. Returns the number of features in the page so the loader
-- knows when it has reached the end.
--
-- Geometry is made valid and simplified to roughly 5 m, which keeps the table
-- small without moving any boundary meaningfully.
create or replace function public.load_linz_suburbs_page(p_fc jsonb)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
  v_features jsonb := coalesce(p_fc->'features', '[]'::jsonb);
begin
  insert into linz_suburbs_staging (
    linz_id, name, name_ascii, major_name, major_name_ascii,
    ta, ta_ascii, locality_type, population, geom, loaded_at
  )
  select
    (f->'properties'->>'id')::bigint,
    f->'properties'->>'name',
    nullif(f->'properties'->>'name_ascii', ''),
    nullif(f->'properties'->>'major_name', ''),
    nullif(f->'properties'->>'major_name_ascii', ''),
    nullif(f->'properties'->>'territorial_authority', ''),
    nullif(f->'properties'->>'territorial_authority_ascii', ''),
    nullif(f->'properties'->>'type', ''),
    nullif(f->'properties'->>'population_estimate', '')::numeric::integer,
    case
      when f->'geometry' is null or jsonb_typeof(f->'geometry') = 'null' then null
      else ST_Multi(
             ST_SimplifyPreserveTopology(
               ST_CollectionExtract(
                 ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON((f->'geometry')::text), 4326)),
                 3),
               0.00005))
    end,
    now()
  from jsonb_array_elements(v_features) as f
  where f->'properties'->>'id' is not null
    and f->'properties'->>'name' is not null
  on conflict (linz_id) do update set
    name             = excluded.name,
    name_ascii       = excluded.name_ascii,
    major_name       = excluded.major_name,
    major_name_ascii = excluded.major_name_ascii,
    ta               = excluded.ta,
    ta_ascii         = excluded.ta_ascii,
    locality_type    = excluded.locality_type,
    population       = excluded.population,
    geom             = excluded.geom,
    loaded_at        = now();

  return jsonb_array_length(v_features);
end $function$;

revoke execute on function public.load_linz_suburbs_page(jsonb) from public, anon, authenticated;
grant  execute on function public.load_linz_suburbs_page(jsonb) to service_role;

-- Report used by the loader to decide whether the swap is safe.
-- A council field holding several names is matched on the first one.
create or replace function public.linz_suburbs_load_report()
returns jsonb
language sql
security definer
set search_path = public, extensions
as $function$
  with s as (
    select *, trim(split_part(coalesce(ta_ascii, ''), ',', 1)) as ta_first
    from linz_suburbs_staging
  )
  select jsonb_build_object(
    'rows',          (select count(*) from s),
    'with_geometry', (select count(*) from s where geom is not null),
    'avg_x',         (select round(avg(ST_X(ST_PointOnSurface(geom)))::numeric, 2) from s where geom is not null),
    'avg_y',         (select round(avg(ST_Y(ST_PointOnSurface(geom)))::numeric, 2) from s where geom is not null),
    'outside_ta_rows', (select count(*) from s
                        where ta_first = '' or lower(ta_first) like 'area outside%'),
    'unmapped_tas',  (select coalesce(jsonb_agg(distinct ta_first), '[]'::jsonb) from s
                      where ta_first <> ''
                        and lower(ta_first) not like 'area outside%'
                        and not exists (select 1 from nz_ta_regions r
                                        where lower(r.ta_ascii) = lower(s.ta_first))),
    'by_region',     (select coalesce(jsonb_object_agg(region, n), '{}'::jsonb) from (
                        select r.region, count(*) as n
                        from s join nz_ta_regions r on lower(r.ta_ascii) = lower(s.ta_first)
                        group by r.region) x)
  );
$function$;

revoke execute on function public.linz_suburbs_load_report() from public, anon, authenticated;
grant  execute on function public.linz_suburbs_load_report() to service_role;

notify pgrst, 'reload schema';