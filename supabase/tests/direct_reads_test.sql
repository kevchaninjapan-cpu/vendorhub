-- Test for closed direct reads (run after phase B).
-- Supabase SQL Editor as postgres, NEW tab, Ctrl+A, Ctrl+Enter.
-- EVERYTHING IS ROLLED BACK. A red "ALL TESTS PASSED (everything rolled back)" is a pass.

do $t$
declare
  l  uuid;
  s  uuid;
  b  uuid;
  n  integer;
begin
  select id, member_id into l, s from public.listings where status in ('live', 'under_offer') order by id limit 1;
  if l is null then raise exception 'SETUP FAILED: no live listing'; end if;
  select id into b from public.profiles where id <> s order by id limit 1;
  if b is null then raise exception 'SETUP FAILED: need a second profile'; end if;

  update public.profiles set role = 'member' where id in (s, b);

  begin
    insert into public.listing_media (listing_id, type, storage_path)
    values (l, 'photo', s::text || '/test/photo.jpg');
  exception when others then
    raise exception 'SETUP FAILED: could not add a test photo row (%)', sqlerrm;
  end;

  begin
    insert into public.listing_documents (listing_id, uploaded_by, doc_type, visibility, file_path, file_name)
    values (l, s, 'lim', 'verified_buyers', s::text || '/' || l::text || '/test.pdf', 'test.pdf');
  exception when others then
    raise exception 'SETUP FAILED: could not add a test document row (%)', sqlerrm;
  end;

  -- 1. Another signed-in user sees no photos and no documents.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.listing_media where listing_id = l;
  if n <> 0 then raise exception 'TEST FAILED: another user can read % photo rows', n; end if;
  select count(*) into n from public.listing_documents where listing_id = l;
  if n <> 0 then raise exception 'TEST FAILED: another user can read % document rows', n; end if;

  -- 2. The seller still sees their own.
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', s, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.listing_media where listing_id = l;
  if n < 1 then raise exception 'TEST FAILED: the seller cannot read their own photos'; end if;
  select count(*) into n from public.listing_documents where listing_id = l;
  if n < 1 then raise exception 'TEST FAILED: the seller cannot read their own documents'; end if;

  -- 3. Signed-out visitors cannot read documents at all.
  reset role;
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  set local role anon;
  begin
    select count(*) into n from public.listing_documents;
    raise exception 'TEST FAILED: a signed-out visitor can read documents';
  exception when insufficient_privilege then
    null;
  end;

  reset role;
  raise exception 'ALL TESTS PASSED (everything rolled back)';
end $t$;