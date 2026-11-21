-- Test for the negotiation rules.
-- Run in the Supabase SQL Editor as postgres, NEW tab, Ctrl+A, Ctrl+Enter.
-- EVERYTHING IS ROLLED BACK. A red "ALL TESTS PASSED (everything rolled back)" is a pass.

do $t$
declare
  l    uuid;
  s    uuid;
  b    uuid;
  base numeric;
  o1   uuid;
  o2   uuid;
  o3   uuid;
  v    text;
  r    jsonb;
begin
  select id, member_id, coalesce(asking_price, beo_amount, 1000000)
    into l, s, base
  from public.listings where status in ('live', 'under_offer') order by id limit 1;
  if l is null then raise exception 'SETUP FAILED: no live listing'; end if;
  select id into b from public.profiles where id <> s order by id limit 1;
  if b is null then raise exception 'SETUP FAILED: need a second profile'; end if;

  update public.profiles set role = 'member' where id in (s, b);
  delete from public.offers where listing_id = l;

  insert into public.offers (listing_id, buyer_id, amount, status, proposed_by)
  values (l, b, base, 'submitted', 'buyer') returning id into o1;
  insert into public.offers (listing_id, buyer_id, amount, status, proposed_by, expires_at)
  values (l, b, base, 'submitted', 'buyer', now() - interval '1 day') returning id into o3;

  update public.offers set created_at = now() - interval '2 hours' where id = o3;
  update public.offers set created_at = now() - interval '1 hour' where id = o1;

  -- 1. Seller can't accept an expired offer.
  perform set_config('request.jwt.claims', json_build_object('sub', s, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.accept_offer(o3);
    raise exception 'TEST FAILED: accepted an expired offer';
  exception when others then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
    if sqlerrm not like '%OFFER_EXPIRED%' then raise exception 'TEST FAILED: expected OFFER_EXPIRED, got %', sqlerrm; end if;
  end;
  reset role;
  update public.offers set status = 'withdrawn' where id = o3;

  -- 2. Buyer can't accept their own offer.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.accept_offer(o1);
    raise exception 'TEST FAILED: buyer accepted their own offer';
  exception when others then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
    if sqlerrm not like '%NOT_YOUR_TURN%' then raise exception 'TEST FAILED: expected NOT_YOUR_TURN, got %', sqlerrm; end if;
  end;
  reset role;

  -- 3. Seller counters.
  perform set_config('request.jwt.claims', json_build_object('sub', s, 'role', 'authenticated')::text, true);
  set local role authenticated;
  o2 := public.counter_offer(o1, round(base * 1.05), 'Test counter');
  reset role;
  select proposed_by into v from public.offers where id = o2;
  if v <> 'seller' then raise exception 'TEST FAILED: counter not recorded as the seller''s'; end if;
  select status::text into v from public.offers where id = o1;
  if v <> 'countered' then raise exception 'TEST FAILED: original not marked countered (is %)', v; end if;

  -- 4. Seller can't accept their own counter, or the superseded offer.
  perform set_config('request.jwt.claims', json_build_object('sub', s, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.accept_offer(o2);
    raise exception 'TEST FAILED: seller accepted their own counter';
  exception when others then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
    if sqlerrm not like '%NOT_YOUR_TURN%' then raise exception 'TEST FAILED: expected NOT_YOUR_TURN, got %', sqlerrm; end if;
  end;
  begin
    perform public.accept_offer(o1);
    raise exception 'TEST FAILED: seller accepted a superseded offer';
  exception when others then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
    if sqlerrm not like '%OFFER_NOT_ACTIVE%' then raise exception 'TEST FAILED: expected OFFER_NOT_ACTIVE, got %', sqlerrm; end if;
  end;
  reset role;

  -- 5. Buyer can see the negotiation, then accept the seller's counter.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.my_negotiations();
  if jsonb_array_length(r) < 1 then raise exception 'TEST FAILED: buyer sees no negotiations'; end if;
  if not exists (select 1 from jsonb_array_elements(r) e
                 where e->>'listing_id' = l::text and (e->>'my_turn')::boolean
                   and jsonb_array_length(e->'offers') >= 2) then
    raise exception 'TEST FAILED: buyer''s negotiation missing, not their turn, or history incomplete';
  end if;
  perform public.accept_offer(o2);
  reset role;
  select status::text into v from public.offers where id = o2;
  if v <> 'accepted' then raise exception 'TEST FAILED: buyer could not accept the counter (status %)', v; end if;

  raise exception 'ALL TESTS PASSED (everything rolled back)';
end $t$;