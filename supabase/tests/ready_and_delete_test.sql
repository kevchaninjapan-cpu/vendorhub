-- Test for "ready to buy" and the delete guard.
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
-- It temporarily makes the live listing's owner an ordinary seller (that
-- change is rolled back too) and clears that listing's documents and
-- activity inside the test only.

do $t$
declare
  l       uuid;
  u       uuid;
  v_ready boolean;
  v_rows  integer;
begin
  select id, member_id into l, u
  from public.listings where status = 'live' order by id limit 1;
  if l is null then raise exception 'SETUP FAILED: no live listing to test with'; end if;

  update public.profiles set role = 'member' where id = u;
  delete from public.listing_documents   where listing_id = l;
  delete from public.offers              where listing_id = l;
  delete from public.viewings            where listing_id = l;
  delete from public.viewing_requests    where listing_id = l;
  delete from public.listing_conversations where listing_id = l;

  -- READY TO BUY ------------------------------------------------------------
  -- 1. All three ticks but no documents: must NOT be ready.
  update public.listings
  set disclosures = jsonb_build_object(
        'lim_provided', true, 'title_provided', true, 'weathertightness_disclosed', true)
  where id = l;
  select ready_to_buy into v_ready from public.listings where id = l;
  if v_ready then
    raise exception 'TEST FAILED: ready_to_buy is true with ticks but no documents';
  end if;

  -- 2. Upload a LIM and a title: must become ready, without saving the listing.
  insert into public.listing_documents
    (listing_id, uploaded_by, doc_type, visibility, file_path, file_name)
  values
    (l, u, 'lim',   'verified_buyers', 'test/' || gen_random_uuid()::text, 'lim.pdf'),
    (l, u, 'title', 'verified_buyers', 'test/' || gen_random_uuid()::text, 'title.pdf');
  select ready_to_buy into v_ready from public.listings where id = l;
  if not v_ready then
    raise exception 'TEST FAILED: ready_to_buy not set after a LIM and title were uploaded';
  end if;

  -- 3. Make the LIM private: must stop being ready.
  update public.listing_documents set visibility = 'private'
  where listing_id = l and doc_type = 'lim';
  select ready_to_buy into v_ready from public.listings where id = l;
  if v_ready then
    raise exception 'TEST FAILED: ready_to_buy still true with a private LIM';
  end if;

  -- DELETE GUARD --------------------------------------------------------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', u, 'role', 'authenticated')::text, true);
  set local role authenticated;

  if is_admin() then
    raise exception 'SETUP FAILED: the test user still counts as staff';
  end if;

  -- The seller must be able to reach their own listing, or the tests prove nothing.
  update public.listings set description = description where id = l;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'SETUP FAILED: seller cannot reach their own listing (% rows)', v_rows;
  end if;

  -- 4. Deleting a live listing must be blocked.
  begin
    delete from public.listings where id = l;
    raise exception 'TEST FAILED: seller deleted a live listing';
  exception when insufficient_privilege then
    null;
  end;

  -- 5. A draft that has a conversation must be blocked.
  reset role;
  update public.listings set status = 'draft' where id = l;
  insert into public.listing_conversations (listing_id, buyer_id, seller_id)
  values (l, u, u);

  set local role authenticated;
  begin
    delete from public.listings where id = l;
    raise exception 'TEST FAILED: seller deleted a draft that has messages';
  exception when insufficient_privilege then
    null;
  end;

  -- 6. A draft with no activity must still be deletable.
  reset role;
  delete from public.listing_conversations where listing_id = l;

  set local role authenticated;
  delete from public.listings where id = l;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'TEST FAILED: seller could not delete a draft with no activity';
  end if;

  reset role;
  raise exception 'ALL TESTS PASSED (everything rolled back)';
end $t$;