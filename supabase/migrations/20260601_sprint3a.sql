-- ============================================================================
-- Sprint 3a - KYC verifications + offer submission
--
-- BACKFILLED from the live database on 2026-09-14, then CORRECTED against
-- pg_constraint output. Documents objects that already exist in production;
-- reconstructed because the original migration was committed empty.
--
-- Idempotent: safe to apply to an existing database, or to a fresh one.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'offer_status') then
    create type offer_status as enum (
      'submitted', 'countered', 'accepted', 'declined', 'withdrawn', 'expired'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'verification_status') then
    create type verification_status as enum ('pending', 'approved', 'rejected');
  end if;

  -- Declared but unused: verifications.id_doc_type is plain text in production.
  if not exists (select 1 from pg_type where typname = 'verification_doc_type') then
    create type verification_doc_type as enum (
      'id_document', 'proof_of_address', 'selfie'
    );
  end if;
end $$;

-- audit_log: id is bigserial in production, not an identity column.
create table if not exists public.audit_log (
  id          bigserial primary key,
  actor_id    uuid references auth.users (id) on delete set null,
  action      text not null,
  target_type text,
  target_id   uuid,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_log_actor   on public.audit_log (actor_id);
create index if not exists idx_audit_log_target  on public.audit_log (target_type, target_id);
create index if not exists idx_audit_log_created on public.audit_log (created_at desc);

create table if not exists public.verifications (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  id_doc_path        text,
  address_proof_path text,
  status             verification_status not null default 'pending',
  verified_at        timestamptz,
  -- No ON DELETE: deleting a reviewer is blocked while their reviews remain,
  -- which preserves the audit trail.
  verified_by        uuid references auth.users (id),
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  id_doc_type        text,
  id_doc_meta        jsonb default '{}'::jsonb,
  address_doc_meta   jsonb default '{}'::jsonb,
  selfie_path        text,
  selfie_meta        jsonb default '{}'::jsonb,
  submitted_at       timestamptz
);

alter table public.verifications add column if not exists id_doc_type      text;
alter table public.verifications add column if not exists id_doc_meta      jsonb default '{}'::jsonb;
alter table public.verifications add column if not exists address_doc_meta jsonb default '{}'::jsonb;
alter table public.verifications add column if not exists selfie_path      text;
alter table public.verifications add column if not exists selfie_meta      jsonb default '{}'::jsonb;
alter table public.verifications add column if not exists submitted_at     timestamptz;

create index if not exists idx_verifications_user   on public.verifications (user_id);
create index if not exists idx_verifications_status on public.verifications (status);
create index if not exists idx_verifications_user_created
  on public.verifications (user_id, created_at desc);

create table if not exists public.offers (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid not null references public.listings (id) on delete cascade,
  buyer_id        uuid not null references auth.users (id) on delete cascade,
  amount          numeric(14,2) not null,
  conditions      text[] default '{}'::text[],
  expires_at      timestamptz,
  status          offer_status not null default 'submitted',
  -- No ON DELETE in production: a countered offer cannot be removed while its
  -- counter references it.
  counter_of      uuid references public.offers (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  settlement_date date,
  notes           text,
  finance_condition         boolean default false,
  building_report_condition boolean default false,
  lim_condition             boolean default false
);

alter table public.offers add column if not exists finance_condition         boolean default false;
alter table public.offers add column if not exists building_report_condition boolean default false;
alter table public.offers add column if not exists lim_condition             boolean default false;
alter table public.offers add column if not exists settlement_date           date;
alter table public.offers add column if not exists notes                     text;

create index if not exists idx_offers_listing    on public.offers (listing_id);
create index if not exists idx_offers_buyer      on public.offers (buyer_id);
create index if not exists idx_offers_status     on public.offers (status);
create index if not exists idx_offers_counter_of on public.offers (counter_of);
create index if not exists idx_offers_listing_active
  on public.offers (listing_id, status)
  where status in ('submitted', 'countered');

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_offers_updated_at on public.offers;
create trigger trg_offers_updated_at
  before update on public.offers
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_verifications_updated_at on public.verifications;
create trigger trg_verifications_updated_at
  before update on public.verifications
  for each row execute function public.touch_updated_at();

-- WARNING: production has TWO is_admin overloads reading different columns:
--   is_admin()     -> profiles.role in ('moderator','admin')  [DEFINER]
--   is_admin(uuid) -> legacy profiles.is_admin boolean        [not DEFINER]
-- All RLS policies call the no-arg form. The uuid overload is dropped in the
-- cleanup migration.

create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('moderator', 'admin')
  );
$$;

create or replace function public.submit_offer(
  p_listing_id uuid, p_amount numeric, p_conditions text[],
  p_expires_at timestamptz, p_settlement_date date, p_notes text
)
returns uuid language plpgsql security definer
set search_path to 'public'
as $function$
declare
  v_buyer_id uuid := auth.uid();
  v_listing record;
  v_verification_status verification_status;
  v_min_price numeric;
  v_new_offer_id uuid;
begin
  if v_buyer_id is null then raise exception 'AUTH_REQUIRED'; end if;

  select l.member_id, l.status, l.method_of_sale, l.asking_price, l.beo_amount
    into v_listing from listings l where l.id = p_listing_id;

  if not found then raise exception 'LISTING_NOT_FOUND'; end if;
  if v_listing.member_id = v_buyer_id then
    raise exception 'CANNOT_OFFER_ON_OWN_LISTING';
  end if;
  if v_listing.status not in ('live','under_offer') then
    raise exception 'LISTING_NOT_ACCEPTING_OFFERS';
  end if;

  select status into v_verification_status
  from verifications where user_id = v_buyer_id
  order by created_at desc limit 1;

  if v_verification_status is null or v_verification_status <> 'approved' then
    raise exception 'VERIFICATION_REQUIRED';
  end if;

  if v_listing.method_of_sale = 'asking_price' and v_listing.asking_price is not null then
    v_min_price := v_listing.asking_price * 0.75;
  elsif v_listing.method_of_sale = 'beo' and v_listing.beo_amount is not null then
    v_min_price := v_listing.beo_amount * 0.75;
  end if;

  if v_min_price is not null and p_amount < v_min_price then
    raise exception 'OFFER_BELOW_MIN_PRICE:%', v_min_price;
  end if;

  insert into offers (
    listing_id, buyer_id, amount, conditions, expires_at,
    settlement_date, notes, status
  ) values (
    p_listing_id, v_buyer_id, p_amount, coalesce(p_conditions, '{}'),
    p_expires_at, p_settlement_date, p_notes, 'submitted'
  ) returning id into v_new_offer_id;

  update listings set status = 'under_offer'
  where id = p_listing_id and status = 'live';

  insert into audit_log (actor_id, action, target_type, target_id, metadata)
  values (v_buyer_id, 'offer_submitted', 'offer', v_new_offer_id,
    jsonb_build_object('listing_id', p_listing_id, 'amount', p_amount));

  return v_new_offer_id;
end $function$;

-- NOTE: accept_offer declines competing offers but returns void, so the app
-- cannot notify those buyers. Surfacing the affected IDs is left to a separate
-- behaviour-change migration.

create or replace function public.accept_offer(p_offer_id uuid)
returns void language plpgsql security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_offer record;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;

  select o.*, l.member_id as seller_id into v_offer
  from offers o join listings l on l.id = o.listing_id
  where o.id = p_offer_id;

  if not found then raise exception 'OFFER_NOT_FOUND'; end if;
  if v_offer.seller_id <> v_actor then raise exception 'NOT_SELLER'; end if;
  if v_offer.status not in ('submitted','countered') then
    raise exception 'OFFER_NOT_ACTIVE';
  end if;

  update offers set status = 'accepted' where id = p_offer_id;

  update offers set status = 'declined'
  where listing_id = v_offer.listing_id
    and id <> p_offer_id
    and status in ('submitted','countered');

  insert into audit_log (actor_id, action, target_type, target_id, metadata)
  values (v_actor, 'offer_accepted', 'offer', p_offer_id,
    jsonb_build_object('listing_id', v_offer.listing_id));
end $function$;

-- decline_offer doubles as "withdraw" when called by the buyer.
create or replace function public.decline_offer(p_offer_id uuid, p_reason text)
returns void language plpgsql security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_offer record;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;

  select o.*, l.member_id as seller_id into v_offer
  from offers o join listings l on l.id = o.listing_id
  where o.id = p_offer_id;

  if not found then raise exception 'OFFER_NOT_FOUND'; end if;
  if v_offer.buyer_id <> v_actor and v_offer.seller_id <> v_actor then
    raise exception 'NOT_PARTICIPANT';
  end if;

  update offers
  set status = case when v_offer.buyer_id = v_actor then 'withdrawn' else 'declined' end
  where id = p_offer_id;

  insert into audit_log (actor_id, action, target_type, target_id, metadata)
  values (v_actor, 'offer_declined', 'offer', p_offer_id,
    jsonb_build_object('reason', p_reason));
end $function$;

create or replace function public.counter_offer(
  p_offer_id uuid, p_amount numeric, p_notes text
)
returns uuid language plpgsql security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_original record;
  v_new_id uuid;
  v_is_seller boolean;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;

  select o.*, l.member_id as seller_id into v_original
  from offers o join listings l on l.id = o.listing_id
  where o.id = p_offer_id;
  if not found then raise exception 'OFFER_NOT_FOUND'; end if;

  v_is_seller := v_original.seller_id = v_actor;

  if not v_is_seller and v_original.buyer_id <> v_actor then
    raise exception 'NOT_PARTICIPANT';
  end if;
  if v_original.status not in ('submitted','countered') then
    raise exception 'OFFER_NOT_ACTIVE';
  end if;

  update offers set status = 'countered' where id = p_offer_id;

  insert into offers (
    listing_id, buyer_id, amount, conditions, expires_at,
    settlement_date, notes, status, counter_of
  ) values (
    v_original.listing_id, v_original.buyer_id, p_amount,
    v_original.conditions, v_original.expires_at,
    v_original.settlement_date, p_notes, 'submitted', p_offer_id
  ) returning id into v_new_id;

  insert into audit_log (actor_id, action, target_type, target_id, metadata)
  values (v_actor, 'offer_countered', 'offer', v_new_id,
    jsonb_build_object('original_offer_id', p_offer_id, 'amount', p_amount));

  return v_new_id;
end $function$;

create or replace function public.review_verification(
  p_verification_id uuid, p_approved boolean, p_reason text
)
returns void language plpgsql security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_user_id uuid;
begin
  if not is_admin() then raise exception 'NOT_ADMIN'; end if;

  select user_id into v_user_id from verifications where id = p_verification_id;
  if v_user_id is null then raise exception 'VERIFICATION_NOT_FOUND'; end if;

  update verifications
  set status = case when p_approved then 'approved'::verification_status
                    else 'rejected'::verification_status end,
      verified_at = case when p_approved then now() else null end,
      verified_by = v_actor,
      notes = coalesce(p_reason, notes)
  where id = p_verification_id;

  insert into audit_log (actor_id, action, target_type, target_id, metadata)
  values (v_actor,
    case when p_approved then 'verification_approved' else 'verification_rejected' end,
    'verification', p_verification_id,
    jsonb_build_object('user_id', v_user_id, 'reason', p_reason));
end $function$;

grant execute on function public.submit_offer(uuid, numeric, text[], timestamptz, date, text) to authenticated;
grant execute on function public.accept_offer(uuid)                                          to authenticated;
grant execute on function public.decline_offer(uuid, text)                                   to authenticated;
grant execute on function public.counter_offer(uuid, numeric, text)                          to authenticated;
grant execute on function public.review_verification(uuid, boolean, text)                    to authenticated;
grant execute on function public.is_admin()                                                  to authenticated;

notify pgrst, 'reload schema';