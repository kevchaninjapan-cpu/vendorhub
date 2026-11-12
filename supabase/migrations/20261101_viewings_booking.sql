-- ============================================================================
-- Open homes and private viewings that buyers can book
--
-- listing_open_homes holds the sessions a seller sets up:
--   open_home - a set time; buyers say they'll attend (optional head-count cap)
--   private   - a time window split into slots; one buyer per slot
-- viewings holds the bookings. Buyers must be signed in (not ID-verified).
-- The buyer's name and phone are stored on the booking and shown to the
-- seller.
--
-- Both tables were empty when this was written, so the new checks apply
-- cleanly. calendly_event_uri / calendly_invitee_uri are left unused.
-- All writes to viewings go through the functions below.
-- ============================================================================

-- ---- listing_open_homes -----------------------------------------------------
alter table public.listing_open_homes
  add column if not exists kind         text not null default 'open_home',
  add column if not exists slot_minutes integer not null default 20,
  add column if not exists cancelled_at timestamptz,
  add column if not exists notes        text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'listing_open_homes_kind_check') then
    alter table public.listing_open_homes
      add constraint listing_open_homes_kind_check check (kind in ('open_home', 'private'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'listing_open_homes_slot_minutes_check') then
    alter table public.listing_open_homes
      add constraint listing_open_homes_slot_minutes_check check (slot_minutes between 10 and 120);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'listing_open_homes_times_check') then
    alter table public.listing_open_homes
      add constraint listing_open_homes_times_check check (ends_at > starts_at);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'listing_open_homes_max_attendees_check') then
    alter table public.listing_open_homes
      add constraint listing_open_homes_max_attendees_check check (max_attendees is null or max_attendees > 0);
  end if;
end $$;

create index if not exists idx_open_homes_listing on public.listing_open_homes (listing_id, starts_at);

-- Explicit WITH CHECK so a seller can't move a session onto another listing.
drop policy if exists open_homes_owner_write on public.listing_open_homes;
create policy open_homes_owner_write on public.listing_open_homes
  for all
  using (exists (select 1 from listings l
                 where l.id = listing_open_homes.listing_id and l.member_id = auth.uid()))
  with check (exists (select 1 from listings l
                      where l.id = listing_open_homes.listing_id and l.member_id = auth.uid()));

-- ---- viewings ---------------------------------------------------------------
alter table public.viewings
  add column if not exists slot_starts_at timestamptz,
  add column if not exists slot_ends_at   timestamptz,
  add column if not exists status         text not null default 'booked',
  add column if not exists buyer_name     text,
  add column if not exists buyer_phone    text,
  add column if not exists cancelled_at   timestamptz,
  add column if not exists cancelled_by   uuid references auth.users (id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'viewings_status_check') then
    alter table public.viewings
      add constraint viewings_status_check check (status in ('booked', 'cancelled'));
  end if;
end $$;

-- One active booking per buyer per session, and one buyer per private slot.
create unique index if not exists uq_viewings_buyer_per_session
  on public.viewings (open_home_id, buyer_id) where status = 'booked';
create unique index if not exists uq_viewings_slot
  on public.viewings (open_home_id, slot_starts_at)
  where status = 'booked' and slot_starts_at is not null;
create index if not exists idx_viewings_listing on public.viewings (listing_id);
create index if not exists idx_viewings_buyer   on public.viewings (buyer_id);

-- viewings had no access rules. Reads are limited to the buyer, the seller
-- and admins; there are no write policies, so writes only happen through
-- the SECURITY DEFINER functions below.
alter table public.viewings enable row level security;

drop policy if exists viewings_buyer_read on public.viewings;
create policy viewings_buyer_read on public.viewings
  for select using (buyer_id = auth.uid());

drop policy if exists viewings_seller_read on public.viewings;
create policy viewings_seller_read on public.viewings
  for select using (exists (select 1 from listings l
                            where l.id = viewings.listing_id and l.member_id = auth.uid()));

drop policy if exists viewings_admin_read on public.viewings;
create policy viewings_admin_read on public.viewings
  for select using (is_admin());

-- ---- Public availability (no buyer identities) ------------------------------
create or replace function public.get_listing_viewing_availability(p_listing_id uuid)
returns table (
  id uuid,
  kind text,
  starts_at timestamptz,
  ends_at timestamptz,
  slot_minutes integer,
  max_attendees integer,
  notes text,
  booked_count integer,
  taken_slots timestamptz[]
)
language sql
stable
security definer
set search_path = public
as $function$
  select
    o.id, o.kind, o.starts_at, o.ends_at, o.slot_minutes, o.max_attendees, o.notes,
    (select count(*)::integer from viewings v
      where v.open_home_id = o.id and v.status = 'booked'),
    coalesce((select array_agg(v.slot_starts_at order by v.slot_starts_at) from viewings v
              where v.open_home_id = o.id and v.status = 'booked' and v.slot_starts_at is not null),
             '{}'::timestamptz[])
  from listing_open_homes o
  join listings l on l.id = o.listing_id
  where o.listing_id = p_listing_id
    and o.cancelled_at is null
    and o.ends_at > now()
    and l.status in ('live', 'under_offer')
  order by o.starts_at;
$function$;

revoke execute on function public.get_listing_viewing_availability(uuid) from public;
grant  execute on function public.get_listing_viewing_availability(uuid) to anon, authenticated;

-- ---- Book -------------------------------------------------------------------
create or replace function public.book_viewing(
  p_open_home_id   uuid,
  p_slot_starts_at timestamptz,
  p_name           text,
  p_phone          text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_actor      uuid := auth.uid();
  v_s          record;
  v_count      integer;
  v_id         uuid;
  v_slot_start timestamptz;
  v_slot_end   timestamptz;
  v_offset     numeric;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'NAME_REQUIRED'; end if;
  if length(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')) < 7 then
    raise exception 'PHONE_REQUIRED';
  end if;

  -- Lock the session so two buyers can't take the last place at once.
  select o.*, l.member_id as seller_id, l.status as listing_status
    into v_s
  from listing_open_homes o
  join listings l on l.id = o.listing_id
  where o.id = p_open_home_id
  for update of o;

  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if v_s.cancelled_at is not null then raise exception 'SESSION_CANCELLED'; end if;
  if v_s.listing_status not in ('live', 'under_offer') then raise exception 'LISTING_NOT_AVAILABLE'; end if;
  if v_s.seller_id = v_actor then raise exception 'OWN_LISTING'; end if;

  if v_s.kind = 'open_home' then
    if v_s.ends_at <= now() then raise exception 'SESSION_PAST'; end if;
    if v_s.max_attendees is not null then
      select count(*) into v_count from viewings
      where open_home_id = p_open_home_id and status = 'booked';
      if v_count >= v_s.max_attendees then raise exception 'SESSION_FULL'; end if;
    end if;
    v_slot_start := null;
    v_slot_end := null;
  else
    if p_slot_starts_at is null then raise exception 'SLOT_REQUIRED'; end if;
    if p_slot_starts_at <= now() then raise exception 'SESSION_PAST'; end if;
    v_slot_start := p_slot_starts_at;
    v_slot_end := p_slot_starts_at + make_interval(mins => v_s.slot_minutes);
    v_offset := (extract(epoch from (p_slot_starts_at - v_s.starts_at)) / 60)::numeric;
    if p_slot_starts_at < v_s.starts_at
       or v_slot_end > v_s.ends_at
       or mod(v_offset, v_s.slot_minutes::numeric) <> 0 then
      raise exception 'SLOT_INVALID';
    end if;
  end if;

  begin
    insert into viewings (
      listing_id, buyer_id, open_home_id, slot_starts_at, slot_ends_at,
      status, buyer_name, buyer_phone
    ) values (
      v_s.listing_id, v_actor, p_open_home_id, v_slot_start, v_slot_end,
      'booked', trim(p_name), trim(p_phone)
    ) returning id into v_id;
  exception when unique_violation then
    if exists (select 1 from viewings
               where open_home_id = p_open_home_id and buyer_id = v_actor and status = 'booked') then
      raise exception 'ALREADY_BOOKED';
    end if;
    raise exception 'SLOT_TAKEN';
  end;

  insert into audit_log (actor_id, action, target_type, target_id, metadata)
  values (v_actor, 'viewing_booked', 'viewing', v_id,
    jsonb_build_object('listing_id', v_s.listing_id, 'open_home_id', p_open_home_id, 'kind', v_s.kind));

  return v_id;
end $function$;

revoke execute on function public.book_viewing(uuid, timestamptz, text, text) from public, anon;
grant  execute on function public.book_viewing(uuid, timestamptz, text, text) to authenticated;

-- ---- Cancel one booking (buyer, seller or admin) ----------------------------
create or replace function public.cancel_viewing(p_viewing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_actor uuid := auth.uid();
  v_v     record;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;

  select v.*, l.member_id as seller_id
    into v_v
  from viewings v
  join listings l on l.id = v.listing_id
  where v.id = p_viewing_id;

  if not found then raise exception 'VIEWING_NOT_FOUND'; end if;
  if v_v.buyer_id <> v_actor and v_v.seller_id <> v_actor and not is_admin() then
    raise exception 'NOT_PARTICIPANT';
  end if;
  if v_v.status = 'cancelled' then return; end if;

  update viewings
  set status = 'cancelled', cancelled_at = now(), cancelled_by = v_actor
  where id = p_viewing_id;

  insert into audit_log (actor_id, action, target_type, target_id, metadata)
  values (v_actor, 'viewing_cancelled', 'viewing', p_viewing_id,
    jsonb_build_object('listing_id', v_v.listing_id,
                       'by', case when v_v.buyer_id = v_actor then 'buyer' else 'seller' end));
end $function$;

revoke execute on function public.cancel_viewing(uuid) from public, anon;
grant  execute on function public.cancel_viewing(uuid) to authenticated;

-- ---- Cancel a whole session (seller or admin) -------------------------------
create or replace function public.cancel_open_home(p_open_home_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_actor uuid := auth.uid();
  v_s     record;
  v_n     integer;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;

  select o.id, o.listing_id, o.cancelled_at, l.member_id as seller_id
    into v_s
  from listing_open_homes o
  join listings l on l.id = o.listing_id
  where o.id = p_open_home_id
  for update of o;

  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if v_s.seller_id <> v_actor and not is_admin() then raise exception 'NOT_LISTING_OWNER'; end if;
  if v_s.cancelled_at is not null then return 0; end if;

  update listing_open_homes set cancelled_at = now() where id = p_open_home_id;

  update viewings
  set status = 'cancelled', cancelled_at = now(), cancelled_by = v_actor
  where open_home_id = p_open_home_id and status = 'booked';
  get diagnostics v_n = row_count;

  insert into audit_log (actor_id, action, target_type, target_id, metadata)
  values (v_actor, 'open_home_cancelled', 'open_home', p_open_home_id,
    jsonb_build_object('listing_id', v_s.listing_id, 'bookings_cancelled', v_n));

  return v_n;
end $function$;

revoke execute on function public.cancel_open_home(uuid) from public, anon;
grant  execute on function public.cancel_open_home(uuid) to authenticated;

notify pgrst, 'reload schema';