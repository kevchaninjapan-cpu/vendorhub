-- Regions, suburb lookups and space cleanup (13 Oct 2026)

-- Unused indexes (space recovery)
drop index if exists public.idx_akl_formatted_address;
drop index if exists public.idx_akl_cv;
drop index if exists public.idx_akl_land_use;
drop index if exists public.idx_akl_land_use_description;
drop index if exists public.idx_dvr_land_area;

-- Macron-aware slugs
create or replace function public.unaccent_safe(value text)
returns text language sql immutable as $$
  select translate(value,
    'ÀÁÂÃÄÅàáâãäåÒÓÔÕÖØòóôõöøÈÉÊËèéêëÌÍÎÏìíîïÙÚÛÜùúûüÑñÇçĀĒĪŌŪāēīōū',
    'AAAAAAaaaaaaOOOOOOooooooEEEEeeeeIIIIiiiiUUUUuuuuNnCcAEIOUaeiou');
$$;

-- Regions
create table if not exists public.regions (
  slug text primary key,
  name text not null unique,
  sort_order int not null default 0,
  is_active boolean not null default false
);

insert into public.regions (slug, name, sort_order, is_active) values
  ('northland','Northland',1,false),('auckland','Auckland',2,true),
  ('waikato','Waikato',3,false),('bay-of-plenty','Bay of Plenty',4,false),
  ('gisborne','Gisborne',5,false),('hawkes-bay','Hawke''s Bay',6,false),
  ('taranaki','Taranaki',7,false),('manawatu-whanganui','Manawatū-Whanganui',8,false),
  ('wellington','Wellington',9,false),('tasman','Tasman',10,false),
  ('nelson','Nelson',11,false),('marlborough','Marlborough',12,false),
  ('west-coast','West Coast',13,false),('canterbury','Canterbury',14,false),
  ('otago','Otago',15,false),('southland','Southland',16,false)
on conflict (slug) do nothing;

alter table public.regions enable row level security;
drop policy if exists "regions public read" on public.regions;
create policy "regions public read" on public.regions for select using (true);

alter table public.suburbs drop constraint if exists suburbs_region_fkey;
alter table public.suburbs add constraint suburbs_region_fkey
  foreign key (region) references public.regions (name) on update cascade;

alter table public.listings drop constraint if exists listings_region_fkey;
alter table public.listings add constraint listings_region_fkey
  foreign key (region) references public.regions (name) on update cascade;

create unique index if not exists suburbs_region_name_key on public.suburbs (region, name);

-- Suburb lookups on rates data
create index if not exists idx_akl_suburb on public.nz_akl_rate_assessment
  (lower(unaccent_safe(split_part(formatted_address, E'\r', 2))));

create or replace function public.akl_suburb_median(p_suburb text)
returns numeric language sql stable as $$
  select round(percentile_cont(0.5) within group (order by cv)::numeric)
  from public.nz_akl_rate_assessment
  where lower(unaccent_safe(split_part(formatted_address, E'\r', 2)))
        = lower(unaccent_safe(p_suburb))
    and cv > 0;
$$;

create or replace function public.akl_comparables(
  p_exclude_key text, p_suburb text, p_land_use text default null,
  p_cv_min numeric default null, p_cv_max numeric default null, p_limit int default 250)
returns setof public.nz_akl_rate_assessment language sql stable as $$
  select * from public.nz_akl_rate_assessment
  where lower(unaccent_safe(split_part(formatted_address, E'\r', 2)))
        = lower(unaccent_safe(p_suburb))
    and cv is not null
    and rate_account_key <> p_exclude_key
    and (p_land_use is null or land_use_description = p_land_use)
    and (p_cv_min is null or cv >= p_cv_min)
    and (p_cv_max is null or cv <= p_cv_max)
  limit p_limit;
$$;

notify pgrst, 'reload schema';