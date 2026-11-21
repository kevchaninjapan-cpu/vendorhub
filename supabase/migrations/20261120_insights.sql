-- ============================================================================
-- Seller Insights + admin Funnels (last 90 days, by week, NZ time)
-- Safe to run more than once.
--
-- 1. site_daily_counts: daily totals per rate-limit bucket (valuation
--    estimates, searches, listing views...). hit_rate_limit() now also bumps
--    these. No personal data.
-- 2. seller_listing_insights(listing): the seller's dashboard. Only the
--    listing's seller or staff can call it. Pro/Elite sections are returned
--    only for Pro/Elite listings.
-- 3. ops_funnels(): admin funnels. Server only.
--
-- UNDO:
--   drop function if exists public.seller_listing_insights(uuid);
--   drop function if exists public.ops_funnels();
--   drop table if exists public.site_daily_counts;
--   (then re-run the anti-cloning phase 1 hit_rate_limit if you drop the table)
-- ============================================================================

create table if not exists public.site_daily_counts (
  day    date    not null,
  metric text    not null,
  n      integer not null default 0,
  primary key (day, metric)
);
alter table public.site_daily_counts enable row level security;
revoke all on table public.site_daily_counts from anon, authenticated;

create or replace function public.hit_rate_limit(
  p_bucket text, p_subject text, p_limit integer, p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits  integer;
begin
  insert into rate_limits (bucket, subject, window_start, hits)
  values (p_bucket, p_subject, v_start, 1)
  on conflict (bucket, subject, window_start)
  do update set hits = rate_limits.hits + 1
  returning hits into v_hits;

  insert into site_daily_counts (day, metric, n)
  values ((now() at time zone 'Pacific/Auckland')::date, p_bucket, 1)
  on conflict (day, metric) do update set n = site_daily_counts.n + 1;

  if random() < 0.01 then
    delete from rate_limits where window_start < now() - interval '2 days';
  end if;

  return v_hits <= p_limit;
end $function$;

revoke execute on function public.hit_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant  execute on function public.hit_rate_limit(text, text, integer, integer) to service_role;

-- ---- Seller insights --------------------------------------------------------
create or replace function public.seller_listing_insights(p_listing_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  l           record;
  v_full      boolean;
  v_now_week  date := date_trunc('week', (now() at time zone 'Pacific/Auckland'))::date;
  v_from_week date;
  v_from      timestamptz;
  v_cards     jsonb;
  v_weeks     jsonb;
  v_docs      jsonb;
  v_viewings  jsonb;
  v_response  jsonb;
  v_health    jsonb;
  v_funnel    jsonb := null;
  v_sources   jsonb := null;
  v_compare   jsonb := null;
  v_peers     integer := 0;
begin
  select li.id, li.member_id, li.status::text as status, li.pack_tier::text as pack_tier,
         li.published_at, li.suburb_id, li.ready_to_buy, li.accepts_viewing_requests,
         coalesce(li.disclosures, '{}'::jsonb) as disclosures
    into l
  from listings li where li.id = p_listing_id;

  if not found then raise exception 'LISTING_NOT_FOUND'; end if;
  if l.member_id is distinct from auth.uid() and not is_admin() then
    raise exception 'NOT_LISTING_OWNER' using errcode = '42501';
  end if;

  v_full := l.pack_tier in ('pro', 'elite');
  v_from_week := v_now_week - 84;
  v_from := v_from_week::timestamp at time zone 'Pacific/Auckland';

  -- Headline cards: last 7 days vs the 7 days before.
  select jsonb_build_object(
    'views', jsonb_build_object(
      'now',  count(*) filter (where viewed_at >= now() - interval '7 days'),
      'prev', count(*) filter (where viewed_at <  now() - interval '7 days')),
    'visitors', jsonb_build_object(
      'now',  count(distinct ((viewed_at at time zone 'Pacific/Auckland')::date::text || coalesce(viewer_id::text, ip_hash::text, id::text)))
                filter (where viewed_at >= now() - interval '7 days'),
      'prev', count(distinct ((viewed_at at time zone 'Pacific/Auckland')::date::text || coalesce(viewer_id::text, ip_hash::text, id::text)))
                filter (where viewed_at <  now() - interval '7 days')))
  into v_cards
  from listing_views
  where listing_id = p_listing_id and viewed_at >= now() - interval '14 days';

  v_cards := v_cards || jsonb_build_object(
    'saves', (select jsonb_build_object(
        'now',  count(*) filter (where created_at >= now() - interval '7 days'),
        'prev', count(*) filter (where created_at <  now() - interval '7 days'))
      from saved_listings where listing_id = p_listing_id and created_at >= now() - interval '14 days'),
    'enquiries', (select jsonb_build_object(
        'now',  count(*) filter (where created_at >= now() - interval '7 days'),
        'prev', count(*) filter (where created_at <  now() - interval '7 days'))
      from listing_conversations where listing_id = p_listing_id and created_at >= now() - interval '14 days'),
    'viewings', (select jsonb_build_object(
        'now',  count(*) filter (where created_at >= now() - interval '7 days'),
        'prev', count(*) filter (where created_at <  now() - interval '7 days'))
      from viewings where listing_id = p_listing_id and created_at >= now() - interval '14 days'),
    'offers', (select jsonb_build_object(
        'now',  count(*) filter (where created_at >= now() - interval '7 days'),
        'prev', count(*) filter (where created_at <  now() - interval '7 days'))
      from offers where listing_id = p_listing_id and counter_of is null and created_at >= now() - interval '14 days')
  );

  -- Weekly series: 13 weeks, Monday start, NZ time.
  select coalesce(jsonb_agg(jsonb_build_object(
      'week', to_char(w.wk, 'YYYY-MM-DD'),
      'views', (select count(*) from listing_views lv
                where lv.listing_id = p_listing_id and lv.viewed_at >= w.a and lv.viewed_at < w.b),
      'visitors', (select count(distinct ((lv.viewed_at at time zone 'Pacific/Auckland')::date::text
                                          || coalesce(lv.viewer_id::text, lv.ip_hash::text, lv.id::text)))
                   from listing_views lv
                   where lv.listing_id = p_listing_id and lv.viewed_at >= w.a and lv.viewed_at < w.b),
      'enquiries', (select count(*) from listing_conversations c
                    where c.listing_id = p_listing_id and c.created_at >= w.a and c.created_at < w.b),
      'offers', (select count(*) from offers o
                 where o.listing_id = p_listing_id and o.counter_of is null
                   and o.created_at >= w.a and o.created_at < w.b)
    ) order by w.wk), '[]'::jsonb)
  into v_weeks
  from (
    select gs::date as wk,
           (gs::date::timestamp at time zone 'Pacific/Auckland') as a,
           ((gs::date + 7)::timestamp at time zone 'Pacific/Auckland') as b
    from generate_series(v_from_week::timestamp, v_now_week::timestamp, interval '7 days') gs
  ) w;

  -- Documents: distinct buyers who downloaded each one (no names).
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', d.id,
      'doc_type', d.doc_type::text,
      'label', coalesce(d.label, d.file_name),
      'visibility', d.visibility::text,
      'downloads', (select count(distinct a.actor_id) from audit_log a
                    where a.action = 'document_downloaded' and a.target_id = d.id
                      and a.metadata->>'as' = 'buyer')
    ) order by d.doc_type::text), '[]'::jsonb)
  into v_docs
  from listing_documents d where d.listing_id = p_listing_id;

  -- Viewings.
  v_viewings := jsonb_build_object(
    'upcoming', (select count(*) from viewings v
                 left join listing_open_homes o on o.id = v.open_home_id
                 where v.listing_id = p_listing_id and v.status = 'booked'
                   and coalesce(v.slot_starts_at, o.starts_at) > now()),
    'open_requests', (select count(*) from viewing_requests
                      where listing_id = p_listing_id and status in ('pending', 'proposed')),
    'past_sessions', coalesce((
      select jsonb_agg(jsonb_build_object(
          'starts_at', o.starts_at,
          'kind', o.kind,
          'booked', (select count(*) from viewings v where v.open_home_id = o.id and v.status = 'booked'),
          'attended', (select count(*) from viewings v where v.open_home_id = o.id and v.attended is true)
        ) order by o.starts_at desc)
      from listing_open_homes o
      where o.listing_id = p_listing_id and o.cancelled_at is null and o.request_id is null
        and o.ends_at < now() and o.ends_at >= v_from), '[]'::jsonb)
  );

  -- Response time: buyer message (that starts a turn) to the seller's next reply.
  with msgs as (
    select m.conversation_id, m.sender_id, m.created_at, c.buyer_id, c.seller_id,
           lag(m.sender_id) over (partition by m.conversation_id order by m.created_at) as prev_sender
    from listing_messages m
    join listing_conversations c on c.id = m.conversation_id
    where c.listing_id = p_listing_id and m.kind = 'text'
  ),
  asks as (
    select a.created_at,
           (select min(r.created_at) from listing_messages r
            where r.conversation_id = a.conversation_id and r.kind = 'text'
              and r.sender_id = a.seller_id and r.created_at > a.created_at) as replied_at
    from msgs a
    where a.sender_id = a.buyer_id
      and (a.prev_sender is null or a.prev_sender <> a.buyer_id)
      and a.created_at >= v_from
  ),
  latest as (
    select distinct on (conversation_id) conversation_id, sender_id, buyer_id, created_at
    from msgs order by conversation_id, created_at desc
  )
  select jsonb_build_object(
    'median_minutes', (select round(percentile_cont(0.5) within group
                                    (order by extract(epoch from (replied_at - created_at)) / 60))::integer
                       from asks where replied_at is not null),
    'replied', (select count(*) from asks where replied_at is not null),
    'waiting_over_24h', (select count(*) from latest
                         where sender_id = buyer_id and created_at < now() - interval '24 hours')
  ) into v_response;

  -- Listing health.
  v_health := jsonb_build_object(
    'status', l.status,
    'pack_tier', l.pack_tier,
    'days_on_market', case when l.published_at is not null and l.status in ('live', 'under_offer')
                           then ((now() at time zone 'Pacific/Auckland')::date
                                 - (l.published_at at time zone 'Pacific/Auckland')::date) end,
    'photos', (select count(*) from listing_media where listing_id = p_listing_id and type::text = 'photo'),
    'ready_to_buy', coalesce(l.ready_to_buy, false),
    'has_lim', exists (select 1 from listing_documents where listing_id = p_listing_id
                       and doc_type = 'lim' and visibility <> 'private'),
    'has_title', exists (select 1 from listing_documents where listing_id = p_listing_id
                         and doc_type = 'title' and visibility <> 'private'),
    'weathertightness', coalesce((l.disclosures->>'weathertightness_disclosed')::boolean, false),
    'sessions_upcoming', (select count(*) from listing_open_homes where listing_id = p_listing_id
                          and cancelled_at is null and request_id is null and starts_at > now()),
    'accepts_requests', coalesce(l.accepts_viewing_requests, true)
  );

  -- Pro / Elite only.
  if v_full then
    v_funnel := jsonb_build_object(
      'visitors', (select count(distinct ((viewed_at at time zone 'Pacific/Auckland')::date::text
                                          || coalesce(viewer_id::text, ip_hash::text, id::text)))
                   from listing_views where listing_id = p_listing_id and viewed_at >= v_from),
      'saved', (select count(distinct user_id) from saved_listings
                where listing_id = p_listing_id and created_at >= v_from),
      'enquired', (select count(distinct buyer_id) from listing_conversations
                   where listing_id = p_listing_id and created_at >= v_from),
      'booked', (select count(distinct buyer_id) from viewings
                 where listing_id = p_listing_id and created_at >= v_from),
      'downloaded', (select count(distinct a.actor_id) from audit_log a
                     where a.action = 'document_downloaded' and a.metadata->>'as' = 'buyer'
                       and a.metadata->>'listing_id' = p_listing_id::text and a.created_at >= v_from),
      'offered', (select count(distinct buyer_id) from offers
                  where listing_id = p_listing_id and created_at >= v_from)
    );

    select coalesce(jsonb_object_agg(cat, n), '{}'::jsonb) into v_sources
    from (
      select case
               when referer is null or referer = '' then 'Direct'
               when referer ~* '(vendorhub|localhost|vercel\.app)' then 'VendorHub'
               when referer ~* '(google\.|bing\.|duckduckgo\.|yahoo\.|ecosia\.)' then 'Search engines'
               when referer ~* '(facebook\.|fb\.|instagram\.|linkedin\.|twitter\.|//x\.com|//t\.co|tiktok\.|reddit\.|whatsapp\.)' then 'Social media'
               else 'Other websites'
             end as cat,
             count(*) as n
      from listing_views
      where listing_id = p_listing_id and viewed_at >= v_from
      group by 1
    ) s;

    if l.suburb_id is not null then
      select count(*) into v_peers from listings
      where suburb_id = l.suburb_id and id <> p_listing_id and status in ('live', 'under_offer');
    end if;

    if v_peers >= 5 then
      v_compare := jsonb_build_object(
        'peers', v_peers,
        'yours', (select count(*) from listing_views
                  where listing_id = p_listing_id and viewed_at >= now() - interval '7 days'),
        'median', (select percentile_cont(0.5) within group (order by x.n)
                   from (select (select count(*) from listing_views lv
                                 where lv.listing_id = p.id and lv.viewed_at >= now() - interval '7 days') as n
                         from listings p
                         where p.suburb_id = l.suburb_id and p.id <> p_listing_id
                           and p.status in ('live', 'under_offer')) x));
    else
      v_compare := jsonb_build_object('peers', v_peers, 'yours', null, 'median', null);
    end if;
  end if;

  return jsonb_build_object(
    'tier_full', v_full,
    'cards', v_cards,
    'weeks', v_weeks,
    'documents', v_docs,
    'viewings', v_viewings,
    'response', v_response,
    'health', v_health,
    'funnel', v_funnel,
    'sources', v_sources,
    'compare', v_compare
  );
end $fn$;

revoke execute on function public.seller_listing_insights(uuid) from public, anon;
grant  execute on function public.seller_listing_insights(uuid) to authenticated, service_role;

-- ---- Admin funnels ----------------------------------------------------------
create or replace function public.ops_funnels()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_now_week  date := date_trunc('week', (now() at time zone 'Pacific/Auckland'))::date;
  v_from_week date;
  v_from      timestamptz;
  v_weeks     jsonb;
  v_seller    jsonb;
  v_buyer     jsonb;
  v_timing    jsonb;
begin
  v_from_week := v_now_week - 84;
  v_from := v_from_week::timestamp at time zone 'Pacific/Auckland';

  select coalesce(jsonb_agg(jsonb_build_object(
      'week', to_char(w.wk, 'YYYY-MM-DD'),
      'signups', (select count(*) from profiles where created_at >= w.a and created_at < w.b),
      'drafts', (select count(*) from listings where created_at >= w.a and created_at < w.b),
      'submitted', (select count(*) from audit_log where action = 'listing_status_changed'
                    and metadata->>'to' = 'pending_review' and created_at >= w.a and created_at < w.b),
      'live', (select count(*) from audit_log where action = 'listing_status_changed'
               and metadata->>'to' = 'live' and created_at >= w.a and created_at < w.b),
      'id_submitted', (select count(*) from verifications where created_at >= w.a and created_at < w.b),
      'verified', (select count(*) from verifications where status = 'approved'
                   and verified_at >= w.a and verified_at < w.b),
      'enquiries', (select count(*) from listing_conversations where created_at >= w.a and created_at < w.b),
      'viewings', (select count(*) from viewings where created_at >= w.a and created_at < w.b),
      'offers', (select count(*) from offers where counter_of is null and created_at >= w.a and created_at < w.b),
      'accepted', (select count(*) from audit_log where action = 'offer_accepted'
                   and created_at >= w.a and created_at < w.b),
      'estimates', (select coalesce(sum(n), 0) from site_daily_counts
                    where metric in ('valuation-estimate', 'valuation-lookup')
                      and day >= w.wk and day < w.wk + 7),
      'searches', (select coalesce(sum(n), 0) from site_daily_counts
                   where metric = 'marketplace-search' and day >= w.wk and day < w.wk + 7)
    ) order by w.wk), '[]'::jsonb)
  into v_weeks
  from (
    select gs::date as wk,
           (gs::date::timestamp at time zone 'Pacific/Auckland') as a,
           ((gs::date + 7)::timestamp at time zone 'Pacific/Auckland') as b
    from generate_series(v_from_week::timestamp, v_now_week::timestamp, interval '7 days') gs
  ) w;

  with u as (select id from profiles where created_at >= v_from),
  ul as (select l.id, l.member_id, l.published_at from listings l join u on u.id = l.member_id)
  select jsonb_build_object(
    'signed_up', (select count(*) from u),
    'created_draft', (select count(distinct member_id) from ul),
    'submitted', (select count(distinct ul.member_id) from ul
                  join audit_log a on a.target_id = ul.id
                   and a.action = 'listing_status_changed' and a.metadata->>'to' = 'pending_review'),
    'went_live', (select count(distinct member_id) from ul where published_at is not null),
    'received_offer', (select count(distinct ul.member_id) from ul join offers o on o.listing_id = ul.id),
    'accepted', (select count(distinct ul.member_id) from ul
                 join offers o on o.listing_id = ul.id and o.status = 'accepted')
  ) into v_seller;

  with u as (select id from profiles where created_at >= v_from)
  select jsonb_build_object(
    'signed_up', (select count(*) from u),
    'submitted_id', (select count(distinct v.user_id) from verifications v join u on u.id = v.user_id),
    'verified', (select count(distinct v.user_id) from verifications v join u on u.id = v.user_id
                 where v.status = 'approved'),
    'engaged', (select count(*) from u
                where exists (select 1 from listing_conversations c where c.buyer_id = u.id)
                   or exists (select 1 from viewings w where w.buyer_id = u.id)
                   or exists (select 1 from viewing_requests r where r.buyer_id = u.id)),
    'offered', (select count(distinct o.buyer_id) from offers o join u on u.id = o.buyer_id)
  ) into v_buyer;

  with s as (
    select target_id,
           min(created_at) filter (where metadata->>'to' = 'pending_review') as sub,
           min(created_at) filter (where metadata->>'to' = 'live') as live
    from audit_log
    where action = 'listing_status_changed' and created_at >= v_from
    group by target_id
  )
  select jsonb_build_object(
    'median_hours_submit_to_live',
      (select round((percentile_cont(0.5) within group
                     (order by extract(epoch from (live - sub)) / 3600))::numeric, 1)
       from s where sub is not null and live is not null and live > sub),
    'listings_measured', (select count(*) from s where sub is not null and live is not null and live > sub)
  ) into v_timing;

  return jsonb_build_object('weeks', v_weeks, 'seller', v_seller, 'buyer', v_buyer, 'timing', v_timing);
end $fn$;

revoke execute on function public.ops_funnels() from public, anon, authenticated;
grant  execute on function public.ops_funnels() to service_role;

notify pgrst, 'reload schema';

-- Check: three rows; anon_can_call false for all.
select proname, has_function_privilege('anon', oid, 'execute') as anon_can_call
from pg_proc where proname in ('seller_listing_insights', 'ops_funnels', 'hit_rate_limit')
order by proname;