-- Test for the verification guard and the offers lock-down.
--
-- Run in the Supabase SQL Editor as postgres, in a NEW tab, then Ctrl+A and
-- Ctrl+Enter. Copy it from this file, not from chat.
--
-- EVERYTHING IS ROLLED BACK. The block always ends in an error, so the error
-- is how it reports:
--
--   ERROR: ALL TESTS PASSED (everything rolled back)      <- this is a pass
--   ERROR: TEST FAILED: ...                               <- a real failure
--   ERROR: SETUP FAILED: ...                              <- the test could not run
--
-- It temporarily makes the live listing's owner and a second profile
-- ordinary users, and clears that listing's offers and the second profile's
-- verifications, inside the test only.

do $t$
declare
  l        uuid;
  u        uuid;
  b        uuid;
  o        uuid;
  v_rows   integer;
  v_status text;
begin
  select id, member_id into l, u
  from public.listings where status = 'live' order by id limit 1;
  if l is null then raise exception 'SETUP FAILED: no live listing to test with'; end if;

  select id into b from public.profiles where id <> u order by id limit 1;
  if b is null then raise exception 'SETUP FAILED: need a second profile to act as the buyer'; end if;

  update public.profiles set role = 'member' where id in (u, b);
  delete from public.offers        where listing_id = l;
  delete from public.verifications where user_id = b;

  insert into public.offers (listing_id, buyer_id, amount, status)
  values (l, b, 1000000, 'submitted')
  returning id into o;

  -- Act as the buyer ----------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;

  if is_admin() then
    raise exception 'SETUP FAILED: the buyer still counts as staff';
  end if;

  -- 1. A user must not insert their own approved verification.
  begin
    insert into public.verifications (user_id, status) values (b, 'approved');
    raise exception 'TEST FAILED: a user inserted their own approved verification';
  exception when insufficient_privilege then
    null;
  end;

  -- 2. A user must not point at documents in someone else's folder.
  begin
    insert into public.verifications (user_id, status, id_doc_path)
    values (b, 'pending', u::text || '/id-1-x.png');
    raise exception 'TEST FAILED: a user used another user''s document path';
  exception when insufficient_privilege then
    null;
  end;

  -- 3. A normal submission must still work.
  insert into public.verifications (user_id, status, id_doc_path, address_proof_path)
  values (b, 'pending', b::text || '/id-1-x.png', b::text || '/addr-1-x.png');
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'TEST FAILED: a normal verification submission was blocked';
  end if;

  -- 4. A buyer must not insert an offer directly.
  begin
    insert into public.offers (listing_id, buyer_id, amount, status)
    values (l, b, 1, 'accepted');
    raise exception 'TEST FAILED: a buyer inserted an offer directly';
  exception when insufficient_privilege then
    null;
  end;

  -- 5. A buyer must not change their own offer's status.
  begin
    update public.offers set status = 'accepted' where id = o;
    raise exception 'TEST FAILED: a buyer changed an offer status directly';
  exception when insufficient_privilege then
    null;
  end;

  -- 6. A buyer must still be able to read their own offer.
  select count(*) into v_rows from public.offers where id = o;
  if v_rows <> 1 then
    raise exception 'TEST FAILED: a buyer cannot read their own offer';
  end if;

  -- Act as the seller ---------------------------------------------------------
  reset role;
  perform set_config('request.jwt.claims',
    json_build_object('sub', u, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- 7. A seller must not edit an offer amount directly.
  begin
    update public.offers set amount = 1 where id = o;
    raise exception 'TEST FAILED: a seller changed an offer amount directly';
  exception when insufficient_privilege then
    null;
  end;

  -- 8. The checked function must still work.
  perform public.accept_offer(o);
  reset role;
  select status::text into v_status from public.offers where id = o;
  if v_status <> 'accepted' then
    raise exception 'TEST FAILED: accept_offer no longer works (status is %)', v_status;
  end if;

  raise exception 'ALL TESTS PASSED (everything rolled back)';
end $t$;