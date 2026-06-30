-- ============================================================================
-- VendorHub Marketplace — initial schema
-- Creates listings, media, open homes, enquiries, offers, messaging,
-- viewings, saved searches/listings, verifications, reports, audit log,
-- reference suburbs/school_zones, plus the search materialised view.
-- ============================================================================

create extension if not exists "postgis";
create extension if not exists "pg_trgm";
create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------------------------------------------------------
do $$ begin
  create type listing_status as enum
    ('draft','pending_review','live','under_offer','sold','withdrawn','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pack_tier as enum ('starter','pro','elite');
exception when duplicate_object then null; end $$;

do $$ begin
  create type method_of_sale as enum ('asking_price','negotiation','tender','beo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type property_type as enum
    ('house','apartment','townhouse','unit','section','lifestyle','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type media_type as enum ('photo','floor_plan','video','tour_3d');
exception when duplicate_object then null; end $$;

do $$ begin
  create type offer_status as enum
    ('submitted','countered','accepted','declined','withdrawn','expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type enquiry_status as enum ('new','read','replied','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type verification_status as enum ('pending','approved','rejected');
exception when duplicate_object then null; end $$;

-- ---------- HELPER FUNCTIONS ----------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Random short id, base36, 6 chars (e.g. 'a8f2qx')
create or replace function gen_short_id() returns text
language plpgsql as $$
declare
  chars text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random()*36 + 1)::int, 1);
  end loop;
  return result;
end $$;

-- Slugify text
create or replace function slugify(value text) returns text
language sql immutable as $$
  select trim(both '-' from regexp_replace(
    lower(unaccent_safe(value)), '[^a-z0-9]+', '-', 'g'
  ));
$$;

-- unaccent_safe wrapper (unaccent ext may not be present)
create or replace function unaccent_safe(value text) returns text
language sql immutable as $$
  select translate(value,
    'ÀÁÂÃÄÅàáâãäåÒÓÔÕÖØòóôõöøÈÉÊËèéêëÌÍÎÏìíîïÙÚÛÜùúûüÑñÇç',
    'AAAAAAaaaaaaOOOOOOooooooEEEEeeeeIIIIiiiiUUUUuuuuNnCc');
$$;

-- ============================================================================
-- LISTINGS
-- ============================================================================
create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references auth.users(id) on delete cascade,

  status listing_status not null default 'draft',
  pack_tier pack_tier not null default 'starter',
  short_id text unique not null default gen_short_id(),

  -- Address links to your existing valuation datasets
  dvr_record_id text,
  auckland_rate_assessment_id text,
  formatted_address text,
  address_norm text,
  street_address text,
  suburb text,
  region text,
  postcode text,
  geom geography(point, 4326),
  display_address_masked boolean not null default true,

  -- Property facts
  property_type property_type,
  bedrooms int check (bedrooms >= 0),
  bathrooms int check (bathrooms >= 0),
  parking int check (parking >= 0),
  floor_area_sqm numeric(10,2),
  land_area_sqm numeric(10,2),
  year_built int,
  chattels text[] default '{}',
  description text,
  headline text,

  -- Sale
  method_of_sale method_of_sale,
  asking_price numeric(14,2),
  price_text text,
  tender_close_at timestamptz,
  beo_amount numeric(14,2),

  -- Frozen valuation snapshot at publish time
  valuation_estimate numeric(14,2),
  valuation_low numeric(14,2),
  valuation_high numeric(14,2),
  valuation_confidence numeric(4,3),

  -- SEO + ranking
  slug text,
  search_rank_boost numeric(3,2) not null default 1.0,

  -- Lifecycle
  published_at timestamptz,
  expires_at timestamptz,
  auto_renew boolean not null default true,

  -- Disclosures + computed "Ready to Buy"
  disclosures jsonb not null default '{}'::jsonb,
  ready_to_buy boolean not null default false,

  -- Moderation
  moderation_notes text,
  rejected_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_status_idx on listings(status);
create index if not exists listings_member_idx on listings(member_id);
create index if not exists listings_suburb_idx on listings(suburb);
create index if not exists listings_region_idx on listings(region);
create index if not exists listings_geom_idx on listings using gist (geom);
create index if not exists listings_short_id_idx on listings(short_id);
create index if not exists listings_published_at_idx on listings(published_at desc);

drop trigger if exists trg_listings_updated_at on listings;
create trigger trg_listings_updated_at
  before update on listings
  for each row execute function set_updated_at();

-- Slug + rank boost + ready_to_buy auto-fill
create or replace function listings_before_save() returns trigger
language plpgsql as $$
declare
  d jsonb := coalesce(new.disclosures, '{}'::jsonb);
begin
  -- Slug
  if new.street_address is not null then
    new.slug := slugify(new.street_address) || '-' || new.short_id;
  end if;

  -- Tier weighting
  new.search_rank_boost := case new.pack_tier
    when 'starter' then 1.0
    when 'pro' then 1.5
    when 'elite' then 2.0
  end;

  -- Ready to Buy: requires LIM, title, weathertightness disclosed
  new.ready_to_buy := coalesce((d->>'lim_provided')::boolean,false)
                  and coalesce((d->>'title_provided')::boolean,false)
                  and coalesce((d->>'weathertightness_disclosed')::boolean,false);

  return new;
end $$;

drop trigger if exists trg_listings_before_save on listings;
create trigger trg_listings_before_save
  before insert or update on listings
  for each row execute function listings_before_save();

-- ============================================================================
-- LISTING MEDIA
-- ============================================================================
create table if not exists listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  type media_type not null default 'photo',
  storage_path text not null,           -- supabase storage key
  public_url text,
  sort_order int not null default 0,
  is_cover boolean not null default false,
  width int,
  height int,
  bytes int,
  caption text,
  created_at timestamptz not null default now()
);
create index if not exists listing_media_listing_idx on listing_media(listing_id, sort_order);
create unique index if not exists listing_media_one_cover
  on listing_media(listing_id) where is_cover;

-- ============================================================================
-- OPEN HOMES + VIEWINGS
-- ============================================================================
create table if not exists listing_open_homes (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  max_attendees int,
  calendly_event_uri text,
  created_at timestamptz not null default now()
);
create index if not exists open_homes_listing_idx on listing_open_homes(listing_id, starts_at);

create table if not exists viewings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  open_home_id uuid references listing_open_homes(id) on delete set null,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  calendly_invitee_uri text,
  attended boolean,
  created_at timestamptz not null default now()
);
create index if not exists viewings_listing_idx on viewings(listing_id);
create index if not exists viewings_buyer_idx on viewings(buyer_id);

-- ============================================================================
-- ENQUIRIES + OFFERS
-- ============================================================================
create table if not exists enquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  relay_email text,
  status enquiry_status not null default 'new',
  created_at timestamptz not null default now()
);
create index if not exists enquiries_listing_idx on enquiries(listing_id, created_at desc);

create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2) not null,
  conditions text[] default '{}',
  expires_at timestamptz,
  status offer_status not null default 'submitted',
  counter_of uuid references offers(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists offers_listing_idx on offers(listing_id, created_at desc);
create index if not exists offers_buyer_idx on offers(buyer_id);

drop trigger if exists trg_offers_updated_at on offers;
create trigger trg_offers_updated_at
  before update on offers
  for each row execute function set_updated_at();

-- ============================================================================
-- MESSAGING (secure chat)
-- ============================================================================
create table if not exists message_threads (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id)
);
create index if not exists threads_seller_idx on message_threads(seller_id, last_message_at desc);
create index if not exists threads_buyer_idx on message_threads(buyer_id, last_message_at desc);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references message_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists messages_thread_idx on messages(thread_id, created_at);

-- ============================================================================
-- BUYER-SIDE: saved searches + saved listings + views
-- ============================================================================
create table if not exists saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  alert_frequency text not null default 'daily'
    check (alert_frequency in ('instant','daily','weekly','off')),
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists saved_searches_user_idx on saved_searches(user_id);

create table if not exists saved_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

create table if not exists listing_views (
  id bigserial primary key,
  listing_id uuid not null references listings(id) on delete cascade,
  viewer_id uuid references auth.users(id) on delete set null,
  ip_hash text,
  referer text,
  viewed_at timestamptz not null default now()
);
create index if not exists listing_views_listing_idx on listing_views(listing_id, viewed_at desc);

-- ============================================================================
-- TRUST: verifications, reports, audit log
-- ============================================================================
create table if not exists verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  id_doc_path text,
  address_proof_path text,
  status verification_status not null default 'pending',
  verified_at timestamptz,
  verified_by uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists verifications_user_idx on verifications(user_id);
drop trigger if exists trg_verifications_updated_at on verifications;
create trigger trg_verifications_updated_at
  before update on verifications
  for each row execute function set_updated_at();

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('listing','user','message')),
  target_id uuid not null,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open'
    check (status in ('open','reviewing','actioned','dismissed')),
  created_at timestamptz not null default now()
);

create table if not exists audit_log (
  id bigserial primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_actor_idx on audit_log(actor_id, created_at desc);

-- ============================================================================
-- REFERENCE DATA: suburbs + school zones (load separately)
-- ============================================================================
create table if not exists suburbs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text not null,
  slug text not null unique,
  geom geography(multipolygon, 4326),
  median_sale_price numeric(14,2),
  active_listings_count int default 0,
  updated_at timestamptz not null default now()
);
create index if not exists suburbs_geom_idx on suburbs using gist(geom);

create table if not exists school_zones (
  id uuid primary key default gen_random_uuid(),
  school_name text not null,
  school_type text,
  decile int,
  slug text not null unique,
  geom geography(multipolygon, 4326),
  updated_at timestamptz not null default now()
);
create index if not exists school_zones_geom_idx on school_zones using gist(geom);

-- ============================================================================
-- SEARCH MATERIALISED VIEW
-- ============================================================================
drop materialized view if exists listings_search;
create materialized view listings_search as
select
  l.id,
  l.short_id,
  l.slug,
  l.status,
  l.pack_tier,
  l.search_rank_boost,
  l.formatted_address,
  l.street_address,
  l.suburb,
  l.region,
  l.postcode,
  l.geom,
  l.property_type,
  l.bedrooms,
  l.bathrooms,
  l.parking,
  l.floor_area_sqm,
  l.land_area_sqm,
  l.year_built,
  l.method_of_sale,
  l.asking_price,
  l.price_text,
  l.valuation_estimate,
  l.ready_to_buy,
  l.published_at,
  setweight(to_tsvector('english', coalesce(l.headline,'')), 'A') ||
  setweight(to_tsvector('english', coalesce(l.suburb,'')), 'B') ||
  setweight(to_tsvector('english', coalesce(l.description,'')), 'C') ||
  setweight(to_tsvector('english', coalesce(array_to_string(l.chattels,' '),'')), 'D')
    as search_doc
from listings l
where l.status in ('live','under_offer');

create index if not exists listings_search_tsv_idx
  on listings_search using gin (search_doc);
create index if not exists listings_search_geom_idx
  on listings_search using gist (geom);
create unique index if not exists listings_search_id_idx
  on listings_search (id);

-- Refresh helper (call after publish/withdraw or on cron)
create or replace function refresh_listings_search() returns void
language plpgsql as $$
begin
  refresh materialized view concurrently listings_search;
end $$;

-- ============================================================================
-- ROW-LEVEL SECURITY
-- ============================================================================
alter table listings           enable row level security;
alter table listing_media      enable row level security;
alter table listing_open_homes enable row level security;
alter table viewings           enable row level security;
alter table enquiries          enable row level security;
alter table offers             enable row level security;
alter table message_threads    enable row level security;
alter table messages           enable row level security;
alter table saved_searches     enable row level security;
alter table saved_listings     enable row level security;
alter table listing_views      enable row level security;
alter table verifications      enable row level security;
alter table reports            enable row level security;

-- Listings: public can read live/under_offer; owners can read/write own
drop policy if exists "listings_public_read" on listings;
create policy "listings_public_read" on listings
  for select using (status in ('live','under_offer'));

drop policy if exists "listings_owner_all" on listings;
create policy "listings_owner_all" on listings
  for all using (auth.uid() = member_id)
  with check (auth.uid() = member_id);

-- Listing media: visible if parent listing is visible OR owner
drop policy if exists "listing_media_read" on listing_media;
create policy "listing_media_read" on listing_media
  for select using (
    exists (
      select 1 from listings l
      where l.id = listing_media.listing_id
        and (l.status in ('live','under_offer') or l.member_id = auth.uid())
    )
  );
drop policy if exists "listing_media_owner_write" on listing_media;
create policy "listing_media_owner_write" on listing_media
  for all using (
    exists (select 1 from listings l where l.id = listing_id and l.member_id = auth.uid())
  )
  with check (
    exists (select 1 from listings l where l.id = listing_id and l.member_id = auth.uid())
  );

-- Open homes: public read for visible listings; owner write
drop policy if exists "open_homes_read" on listing_open_homes;
create policy "open_homes_read" on listing_open_homes
  for select using (
    exists (select 1 from listings l where l.id = listing_id
            and l.status in ('live','under_offer'))
  );
drop policy if exists "open_homes_owner_write" on listing_open_homes;
create policy "open_homes_owner_write" on listing_open_homes
  for all using (
    exists (select 1 from listings l where l.id = listing_id and l.member_id = auth.uid())
  );

-- Enquiries: buyer + seller can see
drop policy if exists "enquiries_participants" on enquiries;
create policy "enquiries_participants" on enquiries
  for select using (
    auth.uid() = buyer_id
    or exists (select 1 from listings l where l.id = listing_id and l.member_id = auth.uid())
  );
drop policy if exists "enquiries_buyer_insert" on enquiries;
create policy "enquiries_buyer_insert" on enquiries
  for insert with check (auth.uid() = buyer_id);

-- Offers: same pattern
drop policy if exists "offers_participants" on offers;
create policy "offers_participants" on offers
  for select using (
    auth.uid() = buyer_id
    or exists (select 1 from listings l where l.id = listing_id and l.member_id = auth.uid())
  );
drop policy if exists "offers_buyer_insert" on offers;
create policy "offers_buyer_insert" on offers
  for insert with check (auth.uid() = buyer_id);
drop policy if exists "offers_participant_update" on offers;
create policy "offers_participant_update" on offers
  for update using (
    auth.uid() = buyer_id
    or exists (select 1 from listings l where l.id = listing_id and l.member_id = auth.uid())
  );

-- Messages
drop policy if exists "threads_participants" on message_threads;
create policy "threads_participants" on message_threads
  for select using (auth.uid() in (buyer_id, seller_id));
drop policy if exists "threads_participants_write" on message_threads;
create policy "threads_participants_write" on message_threads
  for insert with check (auth.uid() in (buyer_id, seller_id));

drop policy if exists "messages_participants" on messages;
create policy "messages_participants" on messages
  for select using (
    exists (select 1 from message_threads t
            where t.id = thread_id and auth.uid() in (t.buyer_id, t.seller_id))
  );
drop policy if exists "messages_send" on messages;
create policy "messages_send" on messages
  for insert with check (
    auth.uid() = sender_id and
    exists (select 1 from message_threads t
            where t.id = thread_id and auth.uid() in (t.buyer_id, t.seller_id))
  );

-- Buyer-only tables
drop policy if exists "saved_searches_owner" on saved_searches;
create policy "saved_searches_owner" on saved_searches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "saved_listings_owner" on saved_listings;
create policy "saved_listings_owner" on saved_listings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Views: insert for any authed user, select only for listing owner
drop policy if exists "views_insert" on listing_views;
create policy "views_insert" on listing_views
  for insert with check (true);
drop policy if exists "views_owner_read" on listing_views;
create policy "views_owner_read" on listing_views
  for select using (
    exists (select 1 from listings l where l.id = listing_id and l.member_id = auth.uid())
  );

-- Verifications: user can read own; only service role writes (default deny)
drop policy if exists "verifications_owner_read" on verifications;
create policy "verifications_owner_read" on verifications
  for select using (auth.uid() = user_id);
drop policy if exists "verifications_owner_insert" on verifications;
create policy "verifications_owner_insert" on verifications
  for insert with check (auth.uid() = user_id);

-- Reports: reporter can insert + read own
drop policy if exists "reports_reporter" on reports;
create policy "reports_reporter" on reports
  for all using (auth.uid() = reporter_id) with check (auth.uid() = reporter_id);