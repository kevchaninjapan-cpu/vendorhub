-- ============================================================================
-- Private viewing requests and listing message threads
--
-- viewing_requests      - a buyer's availability (dates, weekdays, time window)
-- listing_conversations - one thread per buyer per listing (base for the inbox)
-- listing_messages      - messages in a thread ('text' from a person,
--                         'system' for request events)
--
-- A confirmed request becomes a normal booking: a private session in
-- listing_open_homes (with request_id set, hidden from public availability)
-- plus a row in viewings. Existing cancel flows and emails then apply.
-- All writes go through the SECURITY DEFINER functions below.
-- ============================================================================

alter table public.listings
  add column if not exists accepts_viewing_requests boolean not null default true;

-- ---- viewing_requests -------------------------------------------------------
create table if not exists public.viewing_requests (
  id                 uuid primary key default gen_random_uuid(),
  listing_id         uuid not null references public.listings (id) on delete cascade,
  buyer_id           uuid not null references auth.users (id) on delete cascade,
  buyer_name         text not null,
  buyer_phone        text not null,
  date_from          date not null,
  date_to            date not null,
  days               smallint[] not null,
  time_from          time not null,
  time_to            time not null,
  note               text,
  status             text not null default 'pending',
  proposed_starts_at timestamptz,
  proposed_ends_at   timestamptz,
  viewing_id         uuid references public.viewings (id) on delete set null,
  decline_reason     text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint viewing_requests_status_check
    check (status in ('pending', 'proposed', 'confirmed', 'declined', 'withdrawn', 'expired', 'cancelled')),
  constraint viewing_requests_dates_check
    check (date_to >= date_from and date_to - date_from <= 28),
  constraint viewing_requests_times_check
    check (time_to > time_from),
  constraint viewing_requests_days_check
    check (cardinality(days) between 1 and 7 and days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[])
);

-- One open request per buyer per listing.
create unique index if not exists uq_viewing_requests_open
  on public.viewing_requests (listing_id, buyer_id)
  where status in ('pending', 'proposed');
create index if not exists idx_viewing_requests_listing on public.viewing_requests (listing_id, created_at desc);
create index if not exists idx_viewing_requests_buyer   on public.viewing_requests (buyer_id);

drop trigger if exists trg_viewing_requests_updated_at on public.viewing_requests;
create trigger trg_viewing_requests_updated_at
  before update on public.viewing_requests
  for each row execute function public.touch_updated_at();

alter table public.viewing_requests enable row level security;

drop policy if exists viewing_requests_buyer_read on public.viewing_requests;
create policy viewing_requests_buyer_read on public.viewing_requests
  for select using (buyer_id = auth.uid());

drop policy if exists viewing_requests_seller_read on public.viewing_requests;
create policy viewing_requests_seller_read on public.viewing_requests
  for select using (exists (select 1 from listings l
                            where l.id = viewing_requests.listing_id and l.member_id = auth.uid()));

drop policy if exists viewing_requests_admin_read on public.viewing_requests;
create policy viewing_requests_admin_read on public.viewing_requests
  for select using (is_admin());

-- Sessions created from a request.
alter table public.listing_open_homes add column if not exists request_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'listing_open_homes_request_id_fkey') then
    alter table public.listing_open_homes
      add constraint listing_open_homes_request_id_fkey
      foreign key (request_id) references public.viewing_requests (id) on delete set null;
  end if;
end $$;

create index if not exists idx_open_homes_request on public.listing_open_homes (request_id);

-- ---- Conversations and messages ---------------------------------------------
create table if not exists public.listing_conversations (
  id                  uuid primary key default gen_random_uuid(),
  listing_id          uuid not null references public.listings (id) on delete cascade,
  buyer_id            uuid not null references auth.users (id) on delete cascade,
  seller_id           uuid not null references auth.users (id) on delete cascade,
  buyer_last_read_at  timestamptz,
  seller_last_read_at timestamptz,
  last_message_at     timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  constraint listing_conversations_listing_buyer_key unique (listing_id, buyer_id)
);

create index if not exists idx_conversations_buyer  on public.listing_conversations (buyer_id, last_message_at desc);
create index if not exists idx_conversations_seller on public.listing_conversations (seller_id, last_message_at desc);

create table if not exists public.listing_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.listing_conversations (id) on delete cascade,
  sender_id       uuid references auth.users (id) on delete set null,
  kind            text not null default 'text',
  body            text not null,
  created_at      timestamptz not null default now(),
  constraint listing_messages_kind_check check (kind in ('text', 'system')),
  constraint listing_messages_body_check check (length(body) between 1 and 2000)
);

create index if not exists idx_messages_conversation on public.listing_messages (conversation_id, created_at);

alter table public.listing_conversations enable row level security;
alter table public.listing_messages enable row level security;

drop policy if exists conversations_participant_read on public.listing_conversations;
create policy conversations_participant_read on public.listing_conversations
  for select using (buyer_id = auth.uid() or seller_id = auth.uid() or is_admin());

drop policy if exists messages_participant_read on public.listing_messages;
create policy messages_participant_read on public.listing_messages
  for select using (
    is_admin()
    or exists (select 1 from listing_conversations c
               where c.id = listing_messages.conversation_id
                 and (c.buyer_id = auth.uid() or c.seller_id = auth.uid()))
  );

-- ---- Internal helpers (not callable by users) -------------------------------
create or replace function public._vh_ensure_conversation(p_listing_id uuid, p_buyer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_id     uuid;
  v_seller uuid;
begin
  select member_id into v_seller from listings where id = p_listing_id;
  insert into listing_conversations (listing_id, buyer_id, seller_id)
  values (p_listing_id, p_buyer_id, v_seller)
  on conflict (listing_id, buyer_id) do update set seller_id = excluded.seller_id
  returning id into v_id;
  return v_id;
end $function$;

create or replace function public._vh_system_message(p_conversation_id uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  insert into listing_messages (conversation_id, sender_id, kind, body)
  values (p_conversation_id, null, 'system', left(p_body, 2000));
  update listing_conversations set last_message_at = now() where id = p_conversation_id;
end $function$;

create or replace function public._vh_book_request(p_request_id uuid, p_starts timestamptz, p_ends timestamptz)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  r          record;
  v_session  uuid;
  v_viewing  uuid;
  v_minutes  integer;
begin
  select * into r from viewing_requests where id = p_request_id;
  v_minutes := (extract(epoch from (p_ends - p_starts)) / 60)::integer;

  insert into listing_open_homes (listing_id, kind, starts_at, ends_at, slot_minutes, notes, request_id)
  values (r.listing_id, 'private', p_starts, p_ends, v_minutes,
          left('Viewing request from ' || r.buyer_name, 300), r.id)
  returning id into v_session;

  insert into viewings (listing_id, buyer_id, open_home_id, slot_starts_at, slot_ends_at,
                        status, buyer_name, buyer_phone)
  values (r.listing_id, r.buyer_id, v_session, p_starts, p_ends,
          'booked', r.buyer_name, r.buyer_phone)
  returning id into v_viewing;

  update viewing_requests
  set status = 'confirmed', viewing_id = v_viewing,
      proposed_starts_at = p_starts, proposed_ends_at = p_ends
  where id = r.id;

  return v_viewing;
end $function$;

revoke execute on function public._vh_ensure_conversation(uuid, uuid) from public, anon, authenticated;
revoke execute on function public._vh_system_message(uuid, text) from public, anon, authenticated;
revoke execute on function public._vh_book_request(uuid, timestamptz, timestamptz) from public, anon, authenticated;

-- ---- Expire stale requests --------------------------------------------------
create or replace function public.expire_viewing_requests(p_listing_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_n integer;
begin
  update viewing_requests
  set status = 'expired'
  where listing_id = p_listing_id
    and ((status = 'pending' and date_to < (now() at time zone 'Pacific/Auckland')::date)
      or (status = 'proposed' and proposed_starts_at <= now()));
  get diagnostics v_n = row_count;
  return v_n;
end $function$;

revoke execute on function public.expire_viewing_requests(uuid) from public, anon;
grant  execute on function public.expire_viewing_requests(uuid) to authenticated;

-- ---- Buyer: create a request -----------------------------------------------
create or replace function public.create_viewing_request(
  p_listing_id uuid,
  p_date_from  date,
  p_date_to    date,
  p_days       integer[],
  p_time_from  time,
  p_time_to    time,
  p_note       text,
  p_name       text,
  p_phone      text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_actor uuid := auth.uid();
  v_today date := (now() at time zone 'Pacific/Auckland')::date;
  l       record;
  v_id    uuid;
  v_conv  uuid;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'NAME_REQUIRED'; end if;
  if length(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')) < 7 then raise exception 'PHONE_REQUIRED'; end if;

  select id, member_id, status, accepts_viewing_requests into l from listings where id = p_listing_id;
  if not found then raise exception 'LISTING_NOT_FOUND'; end if;
  if l.member_id = v_actor then raise exception 'OWN_LISTING'; end if;
  if l.status not in ('live', 'under_offer') then raise exception 'LISTING_NOT_AVAILABLE'; end if;
  if not l.accepts_viewing_requests then raise exception 'REQUESTS_OFF'; end if;

  if p_date_from is null or p_date_to is null or p_date_from < v_today or p_date_to < p_date_from then
    raise exception 'DATES_INVALID';
  end if;
  if p_date_to - p_date_from > 28 then raise exception 'RANGE_TOO_LONG'; end if;
  if p_days is null or cardinality(p_days) = 0 or not (p_days <@ array[1, 2, 3, 4, 5, 6, 7]) then
    raise exception 'DAYS_REQUIRED';
  end if;
  if p_time_from is null or p_time_to is null or p_time_to <= p_time_from then raise exception 'TIMES_INVALID'; end if;
  if not exists (
    select 1 from generate_series(p_date_from::timestamp, p_date_to::timestamp, interval '1 day') d
    where extract(isodow from d)::integer = any(p_days)
  ) then
    raise exception 'NO_MATCHING_DAYS';
  end if;

  perform expire_viewing_requests(p_listing_id);

  begin
    insert into viewing_requests (
      listing_id, buyer_id, buyer_name, buyer_phone, date_from, date_to,
      days, time_from, time_to, note
    ) values (
      p_listing_id, v_actor, trim(p_name), trim(p_phone), p_date_from, p_date_to,
      (select array_agg(distinct x order by x) from unnest(p_days) as x)::smallint[],
      p_time_from, p_time_to, nullif(left(trim(coalesce(p_note, '')), 500), '')
    ) returning id into v_id;
  exception when unique_violation then
    raise exception 'ALREADY_REQUESTED';
  end;

  v_conv := _vh_ensure_conversation(p_listing_id, v_actor);
  perform _vh_system_message(v_conv, 'Viewing request sent.');

  insert into audit_log (actor_id, action, target_type, target_id, metadata)
  values (v_actor, 'viewing_request_created', 'viewing_request', v_id,
          jsonb_build_object('listing_id', p_listing_id));

  return v_id;
end $function$;

revoke execute on function public.create_viewing_request(uuid, date, date, integer[], time, time, text, text, text) from public, anon;
grant  execute on function public.create_viewing_request(uuid, date, date, integer[], time, time, text, text, text) to authenticated;

-- ---- Seller: confirm or suggest a time --------------------------------------
-- Inside the buyer's window -> booked now ('confirmed').
-- Outside it -> saved as a suggestion ('proposed') for the buyer to accept.
create or replace function public.confirm_viewing_request(
  p_request_id uuid,
  p_starts_at  timestamptz,
  p_minutes    integer
)
returns text
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_actor     uuid := auth.uid();
  r           record;
  v_ends      timestamptz;
  v_local     timestamp;
  v_local_end timestamp;
  v_inside    boolean;
  v_conv      uuid;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;

  select q.*, l.member_id as seller_id
    into r
  from viewing_requests q
  join listings l on l.id = q.listing_id
  where q.id = p_request_id
  for update of q;

  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
  if r.seller_id <> v_actor then raise exception 'NOT_LISTING_OWNER'; end if;
  if r.status not in ('pending', 'proposed') then raise exception 'REQUEST_CLOSED'; end if;
  if p_minutes is null or p_minutes < 15 or p_minutes > 120 then raise exception 'LENGTH_INVALID'; end if;
  if p_starts_at is null or p_starts_at <= now() then raise exception 'TIME_PAST'; end if;

  v_ends      := p_starts_at + make_interval(mins => p_minutes);
  v_local     := p_starts_at at time zone 'Pacific/Auckland';
  v_local_end := v_ends at time zone 'Pacific/Auckland';

  v_inside := v_local::date between r.date_from and r.date_to
          and extract(isodow from v_local)::integer = any(r.days)
          and v_local_end::date = v_local::date
          and v_local::time >= r.time_from
          and v_local_end::time <= r.time_to;

  v_conv := _vh_ensure_conversation(r.listing_id, r.buyer_id);

  if v_inside then
    perform _vh_book_request(r.id, p_starts_at, v_ends);
    perform _vh_system_message(v_conv,
      'Viewing confirmed for ' || to_char(v_local, 'Dy FMDD Mon, FMHH12:MIam') || '.');
    insert into audit_log (actor_id, action, target_type, target_id, metadata)
    values (v_actor, 'viewing_request_confirmed', 'viewing_request', r.id,
            jsonb_build_object('listing_id', r.listing_id));
    return 'confirmed';
  end if;

  update viewing_requests
  set status = 'proposed', proposed_starts_at = p_starts_at, proposed_ends_at = v_ends
  where id = r.id;

  perform _vh_system_message(v_conv,
    'Seller suggested ' || to_char(v_local, 'Dy FMDD Mon, FMHH12:MIam') || '. Waiting for the buyer to accept.');
  insert into audit_log (actor_id, action, target_type, target_id, metadata)
  values (v_actor, 'viewing_request_proposed', 'viewing_request', r.id,
          jsonb_build_object('listing_id', r.listing_id));
  return 'proposed';
end $function$;

revoke execute on function public.confirm_viewing_request(uuid, timestamptz, integer) from public, anon;
grant  execute on function public.confirm_viewing_request(uuid, timestamptz, integer) to authenticated;

-- ---- Buyer: accept a suggested time -----------------------------------------
create or replace function public.accept_viewing_proposal(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_actor   uuid := auth.uid();
  r         record;
  v_viewing uuid;
  v_conv    uuid;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into r from viewing_requests where id = p_request_id for update;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
  if r.buyer_id <> v_actor then raise exception 'NOT_BUYER'; end if;
  if r.status <> 'proposed' or r.proposed_starts_at is null then raise exception 'NO_PROPOSAL'; end if;
  if r.proposed_starts_at <= now() then raise exception 'TIME_PAST'; end if;

  v_viewing := _vh_book_request(r.id, r.proposed_starts_at, r.proposed_ends_at);

  v_conv := _vh_ensure_conversation(r.listing_id, r.buyer_id);
  perform _vh_system_message(v_conv,
    'Buyer accepted. Viewing confirmed for '
    || to_char(r.proposed_starts_at at time zone 'Pacific/Auckland', 'Dy FMDD Mon, FMHH12:MIam') || '.');

  insert into audit_log (actor_id, action, target_type, target_id, metadata)
  values (v_actor, 'viewing_request_accepted', 'viewing_request', r.id,
          jsonb_build_object('listing_id', r.listing_id));

  return v_viewing;
end $function$;

revoke execute on function public.accept_viewing_proposal(uuid) from public, anon;
grant  execute on function public.accept_viewing_proposal(uuid) to authenticated;

-- ---- Seller: decline --------------------------------------------------------
create or replace function public.decline_viewing_request(p_request_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_actor  uuid := auth.uid();
  r        record;
  v_reason text := nullif(left(trim(coalesce(p_reason, '')), 500), '');
  v_conv   uuid;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;

  select q.*, l.member_id as seller_id
    into r
  from viewing_requests q
  join listings l on l.id = q.listing_id
  where q.id = p_request_id
  for update of q;

  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
  if r.seller_id <> v_actor then raise exception 'NOT_LISTING_OWNER'; end if;
  if r.status not in ('pending', 'proposed') then raise exception 'REQUEST_CLOSED'; end if;

  update viewing_requests set status = 'declined', decline_reason = v_reason where id = r.id;

  v_conv := _vh_ensure_conversation(r.listing_id, r.buyer_id);
  perform _vh_system_message(v_conv,
    case when v_reason is null then 'Seller declined the request.'
         else 'Seller declined the request: ' || v_reason end);

  insert into audit_log (actor_id, action, target_type, target_id, metadata)
  values (v_actor, 'viewing_request_declined', 'viewing_request', r.id,
          jsonb_build_object('listing_id', r.listing_id));
end $function$;

revoke execute on function public.decline_viewing_request(uuid, text) from public, anon;
grant  execute on function public.decline_viewing_request(uuid, text) to authenticated;

-- ---- Buyer: withdraw --------------------------------------------------------
create or replace function public.withdraw_viewing_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_actor uuid := auth.uid();
  r       record;
  v_conv  uuid;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into r from viewing_requests where id = p_request_id for update;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
  if r.buyer_id <> v_actor then raise exception 'NOT_BUYER'; end if;
  if r.status not in ('pending', 'proposed') then raise exception 'REQUEST_CLOSED'; end if;

  update viewing_requests set status = 'withdrawn' where id = r.id;

  v_conv := _vh_ensure_conversation(r.listing_id, r.buyer_id);
  perform _vh_system_message(v_conv, 'Buyer withdrew the request.');

  insert into audit_log (actor_id, action, target_type, target_id, metadata)
  values (v_actor, 'viewing_request_withdrawn', 'viewing_request', r.id,
          jsonb_build_object('listing_id', r.listing_id));
end $function$;

revoke execute on function public.withdraw_viewing_request(uuid) from public, anon;
grant  execute on function public.withdraw_viewing_request(uuid) to authenticated;

-- ---- Messages ---------------------------------------------------------------
create or replace function public.send_listing_message(p_conversation_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_actor uuid := auth.uid();
  c       record;
  v_body  text := trim(coalesce(p_body, ''));
  v_id    uuid;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(v_body) = 0 then raise exception 'MESSAGE_EMPTY'; end if;
  if length(v_body) > 2000 then raise exception 'MESSAGE_TOO_LONG'; end if;

  select * into c from listing_conversations where id = p_conversation_id;
  if not found then raise exception 'CONVERSATION_NOT_FOUND'; end if;
  if c.buyer_id <> v_actor and c.seller_id <> v_actor then raise exception 'NOT_PARTICIPANT'; end if;

  insert into listing_messages (conversation_id, sender_id, kind, body)
  values (p_conversation_id, v_actor, 'text', v_body)
  returning id into v_id;

  update listing_conversations
  set last_message_at = now(),
      buyer_last_read_at  = case when buyer_id  = v_actor then now() else buyer_last_read_at end,
      seller_last_read_at = case when seller_id = v_actor then now() else seller_last_read_at end
  where id = p_conversation_id;

  return v_id;
end $function$;

revoke execute on function public.send_listing_message(uuid, text) from public, anon;
grant  execute on function public.send_listing_message(uuid, text) to authenticated;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  update listing_conversations
  set buyer_last_read_at  = case when buyer_id  = v_actor then now() else buyer_last_read_at end,
      seller_last_read_at = case when seller_id = v_actor then now() else seller_last_read_at end
  where id = p_conversation_id
    and (buyer_id = v_actor or seller_id = v_actor);
end $function$;

revoke execute on function public.mark_conversation_read(uuid) from public, anon;
grant  execute on function public.mark_conversation_read(uuid) to authenticated;

-- ---- Cancelling a request booking closes the request ------------------------
create or replace function public._vh_viewing_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_req     uuid;
  v_listing uuid;
  v_buyer   uuid;
  v_conv    uuid;
begin
  if old.status = 'booked' and new.status = 'cancelled' and new.open_home_id is not null then
    update listing_open_homes
    set cancelled_at = coalesce(cancelled_at, now())
    where id = new.open_home_id and request_id is not null
    returning request_id into v_req;

    if v_req is not null then
      update viewing_requests set status = 'cancelled'
      where id = v_req and status = 'confirmed'
      returning listing_id, buyer_id into v_listing, v_buyer;

      if v_listing is not null then
        v_conv := _vh_ensure_conversation(v_listing, v_buyer);
        perform _vh_system_message(v_conv, 'Viewing cancelled.');
      end if;
    end if;
  end if;
  return new;
end $function$;

drop trigger if exists trg_viewings_request_cancel on public.viewings;
create trigger trg_viewings_request_cancel
  after update of status on public.viewings
  for each row execute function public._vh_viewing_cancelled();

-- ---- Hide request sessions from public availability -------------------------
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
    and o.request_id is null
    and o.ends_at > now()
    and l.status in ('live', 'under_offer')
  order by o.starts_at;
$function$;

notify pgrst, 'reload schema';