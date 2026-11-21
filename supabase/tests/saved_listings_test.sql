-- Test for the saved listings guard.
-- Run in the Supabase SQL Editor as postgres, NEW tab, Ctrl+A, Ctrl+Enter.
-- EVERYTHING IS ROLLED BACK. A red "ALL TESTS PASSED (everything rolled back)" is a pass.

do $t$
declare
  live_id  uuid;
  draft_id uuid;
  u        uuid;
  n        integer;
begin
  select id into live_id from public.listings where status in ('live', 'under_offer') order by id limit 1;
  if live_id is null then raise exception 'SETUP FAILED: no live listing'; end if;
  select id into u from public.profiles order by id limit 1;
  if u is null then raise exception 'SETUP FAILED: no profile'; end if;

  -- Make a throwaway draft by temporarily using the live listing's owner.
  insert into public.listings (member_id, status)
  select member_id, 'draft' from public.listings where id = live_id
  returning id into draft_id;

  update public.profiles set role = 'member' where id = u;
  delete from public.saved_listings where user_id = u;

  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- 1. Saving a live listing works.
  insert into public.saved_listings (user_id, listing_id) values (u, live_id);
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'TEST FAILED: could not save a live listing'; end if;

  -- 2. Saving a draft is refused.
  begin
    insert into public.saved_listings (user_id, listing_id) values (u, draft_id);
    raise exception 'TEST FAILED: saved a draft listing';
  exception when insufficient_privilege then
    null;
  end;

  -- 3. Removing your own saved home works.
  delete from public.saved_listings where user_id = u and listing_id = live_id;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'TEST FAILED: could not remove a saved home'; end if;

  reset role;
  raise exception 'ALL TESTS PASSED (everything rolled back)';
end $t$;