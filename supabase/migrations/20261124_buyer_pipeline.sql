-- ============================================================================
-- Seller's buyer pipeline. Safe to run more than once.
--
-- Leads are worked out on read from conversations, viewings, viewing
-- requests and offers, so they're always up to date. Only the seller's own
-- additions are stored: notes, hot/warm/cold, a manual stage (Pro/Elite),
-- and follow-up tasks (Pro/Elite). Both tables are reachable only through
-- the functions below.
--
-- UNDO:
--   drop function if exists public.seller_pipeline();
--   drop function if exists public.crm_update_lead(uuid, uuid, text, boolean, text, text);
--   drop function if exists public.crm_add_task(uuid, uuid, text, date);
--   drop function if exists public.crm_set_task_done(uuid, boolean);
--   drop function if exists public.crm_delete_task(uuid);
--   drop function if exists public.crm_due_reminders();
--   drop function if exists public.crm_mark_reminded(uuid[]);
--   drop function if exists public._crm_is_lead(uuid, uuid);
--   drop table if exists public.crm_tasks;
--   drop table if exists public.crm_lead_meta;
-- ============================================================================

create table if not exists public.crm_lead_meta (
  listing_id     uuid not null references public.listings (id) on delete cascade,
  buyer_id       uuid not null references auth.users (id) on delete cascade,
  seller_id      uuid not null references auth.users (id) on delete cascade,
  stage_override text,
  temperature    text,
  notes          text,
  updated_at     timestamptz not null default now(),
  primary key (listing_id, buyer_id),
  constraint crm_lead_meta_stage_check check (stage_override is null or stage_override in
    ('enquired', 'viewing_booked', 'viewed', 'offer_made', 'negotiating', 'accepted', 'lost')),
  constraint crm_lead_meta_temp_check check (temperature is null or temperature in ('hot', 'warm', 'cold')),
  constraint crm_lead_meta_notes_check check (notes is null or length(notes) <= 4000)
);
alter table public.crm_lead_meta enable row level security;
revoke all on table public.crm_lead_meta from anon, authenticated;

create table if not exists public.crm_tasks (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings (id) on delete cascade,
  buyer_id    uuid not null references auth.users (id) on delete cascade,
  seller_id   uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  due_on      date not null,
  done_at     timestamptz,
  reminded_on date,
  created_at  timestamptz not null default now(),
  constraint crm_tasks_title_check check (length(title) between 1 and 200)
);
create index if not exists idx_crm_tasks_seller on public.crm_tasks (seller_id, done_at, due_on);
create index if not exists idx_crm_tasks_lead on public.crm_tasks (listing_id, buyer_id);
alter table public.crm_tasks enable row level security;
revoke all on table public.crm_tasks from anon, authenticated;

-- ---- Is this buyer a lead on this listing? ----------------------------------
create or replace function public._crm_is_lead(p_listing uuid, p_buyer uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (select 1 from listing_conversations where listing_id = p_listing and buyer_id = p_buyer)
      or exists (select 1 from viewings where listing_id = p_listing and buyer_id = p_buyer)
      or exists (select 1 from viewing_requests where listing_id = p_listing and buyer_id = p_buyer)
      or exists (select 1 from offers where listing_id = p_listing and buyer_id = p_buyer);
$fn$;
revoke execute on function public._crm_is_lead(uuid, uuid) from public, anon, authenticated;

-- ---- The pipeline for the signed-in seller ----------------------------------
create or replace function public.seller_pipeline()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_uid   uuid := auth.uid();
  v_today date := (now() at time zone 'Pacific/Auckland')::date;
  v_out   jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  with my_listings as (
    select id, coalesce(headline, formatted_address, 'Listing') as title,
           pack_tier::text as tier, (pack_tier::text in ('pro', 'elite')) as is_full
    from listings where member_id = v_uid
  ),
  pairs as (
    select listing_id, buyer_id from listing_conversations where listing_id in (select id from my_listings)
    union select listing_id, buyer_id from viewings where listing_id in (select id from my_listings)
    union select listing_id, buyer_id from viewing_requests where listing_id in (select id from my_listings)
    union select listing_id, buyer_id from offers where listing_id in (select id from my_listings)
  ),
  leads as (
    select p.listing_id, p.buyer_id, ml.title, ml.is_full,
      lo.status as offer_status, lo.amount as offer_amount, lo.proposed_by as offer_by,
      exists (select 1 from offers x where x.listing_id = p.listing_id and x.buyer_id = p.buyer_id
              and x.counter_of is not null) as has_counter,
      exists (select 1 from offers x where x.listing_id = p.listing_id and x.buyer_id <> p.buyer_id
              and x.status::text = 'accepted') as other_accepted,
      exists (select 1 from viewings v left join listing_open_homes o on o.id = v.open_home_id
              where v.listing_id = p.listing_id and v.buyer_id = p.buyer_id and v.status = 'booked'
                and (v.attended is true or coalesce(v.slot_starts_at, o.starts_at) < now())) as viewed,
      (exists (select 1 from viewings v left join listing_open_homes o on o.id = v.open_home_id
               where v.listing_id = p.listing_id and v.buyer_id = p.buyer_id and v.status = 'booked'
                 and coalesce(v.slot_starts_at, o.starts_at) >= now())
       or exists (select 1 from viewing_requests r where r.listing_id = p.listing_id and r.buyer_id = p.buyer_id
                  and r.status in ('pending', 'proposed', 'confirmed'))) as booked,
      c.id as conversation_id,
      greatest(
        (select max(m.created_at) from listing_messages m where m.conversation_id = c.id and m.kind = 'text'),
        (select max(v.created_at) from viewings v where v.listing_id = p.listing_id and v.buyer_id = p.buyer_id),
        (select max(r.created_at) from viewing_requests r where r.listing_id = p.listing_id and r.buyer_id = p.buyer_id),
        (select max(x.created_at) from offers x where x.listing_id = p.listing_id and x.buyer_id = p.buyer_id),
        c.created_at
      ) as last_contact_at,
      coalesce(
        (select nullif(trim(r.buyer_name), '') from viewing_requests r
          where r.listing_id = p.listing_id and r.buyer_id = p.buyer_id order by r.created_at desc limit 1),
        (select nullif(trim(v.buyer_name), '') from viewings v
          where v.listing_id = p.listing_id and v.buyer_id = p.buyer_id order by v.created_at desc limit 1),
        (select nullif(trim(pr.full_name), '') from profiles pr where pr.id = p.buyer_id),
        'Buyer') as name,
      coalesce(
        (select nullif(trim(r.buyer_phone), '') from viewing_requests r
          where r.listing_id = p.listing_id and r.buyer_id = p.buyer_id order by r.created_at desc limit 1),
        (select nullif(trim(v.buyer_phone), '') from viewings v
          where v.listing_id = p.listing_id and v.buyer_id = p.buyer_id order by v.created_at desc limit 1)
      ) as phone,
      meta.stage_override, meta.temperature, meta.notes
    from pairs p
    join my_listings ml on ml.id = p.listing_id
    left join listing_conversations c on c.listing_id = p.listing_id and c.buyer_id = p.buyer_id
    left join crm_lead_meta meta on meta.listing_id = p.listing_id and meta.buyer_id = p.buyer_id
    left join lateral (
      select x.status::text as status, x.amount, x.proposed_by
      from offers x where x.listing_id = p.listing_id and x.buyer_id = p.buyer_id
      order by x.created_at desc, (x.status::text = 'submitted') desc
      limit 1
    ) lo on true
    where p.buyer_id <> v_uid
  ),
  staged as (
    select l.*,
      case
        when l.offer_status = 'accepted' then 'accepted'
        when l.other_accepted or l.offer_status in ('declined', 'withdrawn', 'expired') then 'lost'
        when l.offer_status = 'submitted' and l.has_counter then 'negotiating'
        when l.offer_status = 'submitted' then 'offer_made'
        when l.viewed then 'viewed'
        when l.booked then 'viewing_booked'
        else 'enquired'
      end as auto_stage
    from leads l
  )
  select jsonb_build_object(
    'today', v_today,
    'listings', coalesce((select jsonb_agg(jsonb_build_object(
        'id', ml.id, 'title', ml.title, 'tier', ml.tier, 'full', ml.is_full) order by ml.title)
      from my_listings ml), '[]'::jsonb),
    'leads', coalesce((select jsonb_agg(jsonb_build_object(
        'listing_id', s.listing_id,
        'buyer_id', s.buyer_id,
        'listing_title', s.title,
        'full', s.is_full,
        'name', s.name,
        'phone', s.phone,
        'auto_stage', s.auto_stage,
        'stage', coalesce(case when s.is_full then s.stage_override end, s.auto_stage),
        'stage_is_manual', (s.is_full and s.stage_override is not null),
        'temperature', s.temperature,
        'notes', s.notes,
        'last_contact_at', s.last_contact_at,
        'conversation_id', s.conversation_id,
        'offer_status', s.offer_status,
        'offer_amount', s.offer_amount,
        'offer_by', s.offer_by,
        'tasks', case when s.is_full then coalesce((
            select jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'due_on', t.due_on,
                                                'done', t.done_at is not null)
                             order by (t.done_at is not null), t.due_on)
            from crm_tasks t
            where t.listing_id = s.listing_id and t.buyer_id = s.buyer_id and t.seller_id = v_uid
              and (t.done_at is null or t.done_at > now() - interval '14 days')), '[]'::jsonb)
          else '[]'::jsonb end
      ) order by s.last_contact_at desc nulls last) from staged s), '[]'::jsonb),
    'due', coalesce((select jsonb_agg(jsonb_build_object(
        'id', t.id, 'title', t.title, 'due_on', t.due_on,
        'listing_id', t.listing_id, 'buyer_id', t.buyer_id, 'overdue', t.due_on < v_today)
        order by t.due_on)
      from crm_tasks t join my_listings ml on ml.id = t.listing_id and ml.is_full
      where t.seller_id = v_uid and t.done_at is null and t.due_on <= v_today), '[]'::jsonb)
  ) into v_out;

  return v_out;
end $fn$;

-- ---- Update notes / label / stage ------------------------------------------
-- p_stage: set a manual stage (Pro/Elite). p_clear_stage: back to automatic.
-- p_temperature: 'hot' | 'warm' | 'cold' | 'none' (clears) | null (no change).
-- p_notes: new notes, or null for no change.
create or replace function public.crm_update_lead(
  p_listing_id uuid, p_buyer_id uuid, p_stage text, p_clear_stage boolean, p_temperature text, p_notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_tier text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select pack_tier::text into v_tier from listings where id = p_listing_id and member_id = auth.uid();
  if not found then raise exception 'NOT_LISTING_OWNER' using errcode = '42501'; end if;
  if not _crm_is_lead(p_listing_id, p_buyer_id) then raise exception 'LEAD_NOT_FOUND'; end if;

  if p_stage is not null then
    if v_tier not in ('pro', 'elite') then raise exception 'PRO_FEATURE'; end if;
    if p_stage not in ('enquired', 'viewing_booked', 'viewed', 'offer_made', 'negotiating', 'accepted', 'lost') then
      raise exception 'STAGE_INVALID';
    end if;
  end if;
  if p_temperature is not null and p_temperature not in ('hot', 'warm', 'cold', 'none') then
    raise exception 'TEMPERATURE_INVALID';
  end if;

  insert into crm_lead_meta (listing_id, buyer_id, seller_id)
  values (p_listing_id, p_buyer_id, auth.uid())
  on conflict (listing_id, buyer_id) do nothing;

  update crm_lead_meta set
    stage_override = case when coalesce(p_clear_stage, false) then null
                          when p_stage is not null then p_stage
                          else stage_override end,
    temperature = case when p_temperature is null then temperature
                       when p_temperature = 'none' then null
                       else p_temperature end,
    notes = case when p_notes is null then notes else nullif(left(trim(p_notes), 4000), '') end,
    updated_at = now()
  where listing_id = p_listing_id and buyer_id = p_buyer_id;
end $fn$;

-- ---- Tasks (Pro / Elite) -----------------------------------------------------
create or replace function public.crm_add_task(p_listing_id uuid, p_buyer_id uuid, p_title text, p_due_on date)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_tier text;
  v_id   uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select pack_tier::text into v_tier from listings where id = p_listing_id and member_id = auth.uid();
  if not found then raise exception 'NOT_LISTING_OWNER' using errcode = '42501'; end if;
  if v_tier not in ('pro', 'elite') then raise exception 'PRO_FEATURE'; end if;
  if not _crm_is_lead(p_listing_id, p_buyer_id) then raise exception 'LEAD_NOT_FOUND'; end if;
  if p_due_on is null or length(trim(coalesce(p_title, ''))) = 0 or length(trim(p_title)) > 200 then
    raise exception 'TASK_INVALID';
  end if;

  insert into crm_tasks (listing_id, buyer_id, seller_id, title, due_on)
  values (p_listing_id, p_buyer_id, auth.uid(), trim(p_title), p_due_on)
  returning id into v_id;
  return v_id;
end $fn$;

create or replace function public.crm_set_task_done(p_task_id uuid, p_done boolean)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  update crm_tasks
  set done_at = case when p_done then coalesce(done_at, now()) else null end
  where id = p_task_id and seller_id = auth.uid();
  if not found then raise exception 'TASK_NOT_FOUND'; end if;
end $fn$;

create or replace function public.crm_delete_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  delete from crm_tasks where id = p_task_id and seller_id = auth.uid();
  if not found then raise exception 'TASK_NOT_FOUND'; end if;
end $fn$;

-- ---- Reminders (server only) -------------------------------------------------
create or replace function public.crm_due_reminders()
returns table (task_id uuid, seller_id uuid, title text, due_on date, listing_title text)
language sql
stable
security definer
set search_path = public
as $fn$
  select t.id, t.seller_id, t.title, t.due_on, coalesce(l.headline, l.formatted_address, 'Listing')
  from crm_tasks t
  join listings l on l.id = t.listing_id
  where t.done_at is null
    and t.due_on <= (now() at time zone 'Pacific/Auckland')::date
    and (t.reminded_on is null or t.reminded_on < (now() at time zone 'Pacific/Auckland')::date)
    and l.member_id = t.seller_id
    and l.pack_tier::text in ('pro', 'elite')
  order by t.seller_id, t.due_on
  limit 500;
$fn$;

create or replace function public.crm_mark_reminded(p_ids uuid[])
returns void
language sql
security definer
set search_path = public
as $fn$
  update crm_tasks set reminded_on = (now() at time zone 'Pacific/Auckland')::date where id = any(p_ids);
$fn$;

revoke execute on function public.seller_pipeline() from public, anon;
revoke execute on function public.crm_update_lead(uuid, uuid, text, boolean, text, text) from public, anon;
revoke execute on function public.crm_add_task(uuid, uuid, text, date) from public, anon;
revoke execute on function public.crm_set_task_done(uuid, boolean) from public, anon;
revoke execute on function public.crm_delete_task(uuid) from public, anon;
revoke execute on function public.crm_due_reminders() from public, anon, authenticated;
revoke execute on function public.crm_mark_reminded(uuid[]) from public, anon, authenticated;

grant execute on function public.seller_pipeline() to authenticated;
grant execute on function public.crm_update_lead(uuid, uuid, text, boolean, text, text) to authenticated;
grant execute on function public.crm_add_task(uuid, uuid, text, date) to authenticated;
grant execute on function public.crm_set_task_done(uuid, boolean) to authenticated;
grant execute on function public.crm_delete_task(uuid) to authenticated;
grant execute on function public.crm_due_reminders() to service_role;
grant execute on function public.crm_mark_reminded(uuid[]) to service_role;

notify pgrst, 'reload schema';

-- Check: want 7 rows, anon_can_call false for all.
select proname, has_function_privilege('anon', oid, 'execute') as anon_can_call
from pg_proc
where proname in ('seller_pipeline', 'crm_update_lead', 'crm_add_task', 'crm_set_task_done',
                  'crm_delete_task', 'crm_due_reminders', 'crm_mark_reminded')
order by proname;