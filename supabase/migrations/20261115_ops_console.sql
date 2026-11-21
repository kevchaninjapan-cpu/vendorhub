-- ============================================================================
-- Ops console + profile role lock-down
--
-- 1. SECURITY: profiles_self_update let a signed-in user update ANY column on
--    their own row, including role. With the public key that meant anyone
--    could make themselves an admin. Users may now only change their own
--    personal details; role, is_admin, email and id are server-only.
-- 2. ops_dashboard_stats(): all dashboard figures in one call, server only.
-- ============================================================================

begin;

revoke insert, update on table public.profiles from anon;

-- Revoking the table-level privilege also clears column privileges, so the
-- column grants must come after.
revoke update on table public.profiles from authenticated;
grant update (full_name, phone, address_line1, address_line2, city, country,
              date_of_birth, onboarding_status, submitted_at, updated_at)
  on public.profiles to authenticated;

revoke insert on table public.profiles from authenticated;
grant insert (id, email, full_name, phone, address_line1, address_line2, city, country,
              date_of_birth, onboarding_status, submitted_at, created_at, updated_at)
  on public.profiles to authenticated;

commit;

-- ---- Dashboard figures ------------------------------------------------------
create or replace function public.ops_dashboard_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $f$
  with latest_text as (
    select c.id as conversation_id, c.buyer_id, c.listing_id, m.sender_id, m.created_at
    from listing_conversations c
    join lateral (
      select lm.sender_id, lm.created_at
      from listing_messages lm
      where lm.conversation_id = c.id and lm.kind = 'text'
      order by lm.created_at desc
      limit 1
    ) m on true
  ),
  waiting as (
    select lt.conversation_id,
           coalesce(l.headline, l.formatted_address, 'Listing') as listing_title,
           lt.created_at as waiting_since
    from latest_text lt
    join listings l on l.id = lt.listing_id
    where lt.sender_id = lt.buyer_id
      and lt.created_at < now() - interval '24 hours'
  )
  select jsonb_build_object(
    'listings_by_status', coalesce((
      select jsonb_object_agg(s, n) from (
        select status::text as s, count(*) as n from listings group by status) x), '{}'::jsonb),
    'users_total',  (select count(*) from profiles),
    'users_new_7d', (select count(*) from profiles where created_at > now() - interval '7 days'),
    'verifications_pending', (
      select count(*) from (
        select distinct on (user_id) user_id, status
        from verifications order by user_id, created_at desc) v
      where v.status = 'pending'),
    'offers_active', (select count(*) from offers where status in ('submitted', 'countered')),
    'offers_7d_by_status', coalesce((
      select jsonb_object_agg(s, n) from (
        select status::text as s, count(*) as n from offers
        where created_at > now() - interval '7 days' group by status) x), '{}'::jsonb),
    'viewings_upcoming', (
      select count(*) from viewings v
      left join listing_open_homes o on o.id = v.open_home_id
      where v.status = 'booked' and coalesce(v.slot_starts_at, o.starts_at) > now()),
    'requests_open', (select count(*) from viewing_requests where status in ('pending', 'proposed')),
    'unanswered_total', (select count(*) from waiting),
    'unanswered', coalesce((
      select jsonb_agg(to_jsonb(w) order by w.waiting_since)
      from (select * from waiting order by waiting_since limit 10) w), '[]'::jsonb)
  );
$f$;

revoke execute on function public.ops_dashboard_stats() from public, anon, authenticated;
grant  execute on function public.ops_dashboard_stats() to service_role;

notify pgrst, 'reload schema';

-- ---- Check: want role_updatable = false, role_insertable = false, phone_updatable = true
select
  has_column_privilege('authenticated', 'public.profiles', 'role',  'UPDATE') as role_updatable,
  has_column_privilege('authenticated', 'public.profiles', 'role',  'INSERT') as role_insertable,
  has_column_privilege('authenticated', 'public.profiles', 'phone', 'UPDATE') as phone_updatable;