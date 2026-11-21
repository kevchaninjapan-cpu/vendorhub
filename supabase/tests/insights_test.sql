-- Test for seller insights and admin funnels.
--
-- Run in the Supabase SQL Editor as postgres, in a NEW tab, then Ctrl+A and
-- Ctrl+Enter. Copy it from this file, not from chat.
--
-- EVERYTHING IS ROLLED BACK. The block always ends in an error:
--   ERROR: ALL TESTS PASSED (everything rolled back)   <- pass
--   ERROR: TEST FAILED: ...                            <- real failure
--   ERROR: SETUP FAILED: ...                           <- couldn't run

do $t$
declare
  l uuid;
  u uuid;
  o uuid;
  r jsonb;
begin
  select id, member_id into l, u from public.listings where status = 'live' order by id limit 1;
  if l is null then raise exception 'SETUP FAILED: no live listing to test with'; end if;
  select id into o from public.profiles where id <> u order by id limit 1;
  if o is null then raise exception 'SETUP FAILED: need a second profile'; end if;

  update public.profiles set role = 'member' where id in (u, o);
  update public.listings set pack_tier = 'starter' where id = l;

  -- 1. The seller gets their data; starter gets no Pro sections.
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.seller_listing_insights(l);
  if r->'cards' is null or r->'health' is null then raise exception 'TEST FAILED: seller got no data'; end if;
  if jsonb_array_length(r->'weeks') <> 13 then
    raise exception 'TEST FAILED: expected 13 weeks, got %', jsonb_array_length(r->'weeks');
  end if;
  if (r->>'tier_full')::boolean or jsonb_typeof(r->'funnel') <> 'null' then
    raise exception 'TEST FAILED: a Starter listing got Pro data';
  end if;

  -- 2. Pro gets the funnel and sources.
  reset role;
  update public.listings set pack_tier = 'pro' where id = l;
  set local role authenticated;
  r := public.seller_listing_insights(l);
  if jsonb_typeof(r->'funnel') <> 'object' or jsonb_typeof(r->'sources') <> 'object' then
    raise exception 'TEST FAILED: a Pro listing got no funnel or sources';
  end if;

  -- 3. Another user can't read it.
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', o, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    r := public.seller_listing_insights(l);
    raise exception 'TEST FAILED: another user read the insights';
  exception when insufficient_privilege then
    null;
  end;

  -- 4. Admin funnels work (server only).
  reset role;
  r := public.ops_funnels();
  if jsonb_array_length(r->'weeks') <> 13 or r->'seller' is null or r->'buyer' is null then
    raise exception 'TEST FAILED: ops_funnels returned incomplete data';
  end if;

  -- 5. Daily counts are recorded.
  perform public.hit_rate_limit('insights-test', 'x', 100, 60);
  if not exists (select 1 from public.site_daily_counts where metric = 'insights-test') then
    raise exception 'TEST FAILED: hit_rate_limit did not record a daily count';
  end if;

  raise exception 'ALL TESTS PASSED (everything rolled back)';
end $t$;