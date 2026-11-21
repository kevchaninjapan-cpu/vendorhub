-- Test for submit_verification.
--
-- Run in the Supabase SQL Editor as postgres, in a NEW tab, then Ctrl+A and
-- Ctrl+Enter. Copy it from this file, not from chat. Run the migration first.
--
-- EVERYTHING IS ROLLED BACK. The block always ends in an error, so the error
-- is how it reports:
--
--   ERROR: ALL TESTS PASSED (everything rolled back)      <- this is a pass
--   ERROR: TEST FAILED: ...                               <- a real failure
--   ERROR: SETUP FAILED: ...                              <- the test could not run
--
-- It temporarily makes two profiles ordinary users and clears one of them
-- verifications, inside the test only.

do $t$
declare
  a       uuid;
  b       uuid;
  v_id    uuid;
  v_user  uuid;
  v_stat  text;
begin
  select id into a from public.profiles order by id limit 1;
  select id into b from public.profiles where id <> a order by id limit 1;
  if a is null or b is null then raise exception 'SETUP FAILED: need two profiles'; end if;

  update public.profiles set role = 'member' where id in (a, b);
  delete from public.verifications where user_id = b;

  -- Act as user b.
  perform set_config('request.jwt.claims',
    json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;

  if is_admin() then raise exception 'SETUP FAILED: user b still counts as staff'; end if;
  if auth.uid() is distinct from b then raise exception 'SETUP FAILED: auth.uid() is not user b'; end if;

  -- 1. A path in someone else's folder must be refused.
  begin
    perform public.submit_verification(
      a::text || '/id-1-x.png', 'passport', b::text || '/addr-1-x.png', null, '{}'::jsonb);
    raise exception 'TEST FAILED: used another user''s ID path';
  exception when others then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
  end;

  begin
    perform public.submit_verification(
      b::text || '/id-1-x.png', 'passport', a::text || '/addr-1-x.png', null, '{}'::jsonb);
    raise exception 'TEST FAILED: used another user''s address path';
  exception when others then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
  end;

  -- 2. A path that climbs out of the folder must be refused.
  begin
    perform public.submit_verification(
      b::text || '/../' || a::text || '/id-1-x.png', 'passport', b::text || '/addr-1-x.png', null, '{}'::jsonb);
    raise exception 'TEST FAILED: accepted a path containing ..';
  exception when others then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
  end;

  -- 3. A missing proof of address must be refused.
  begin
    perform public.submit_verification(
      b::text || '/id-1-x.png', 'passport', null, null, '{}'::jsonb);
    raise exception 'TEST FAILED: accepted a submission with no proof of address';
  exception when others then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
  end;

  -- 4. A normal submission must work, as the caller, and start pending.
  v_id := public.submit_verification(
    b::text || '/id-1-x.png', 'passport', b::text || '/addr-1-x.png', null,
    json_build_object('notes', 'test')::jsonb);

  reset role;
  select user_id, status::text into v_user, v_stat from public.verifications where id = v_id;
  if v_user is distinct from b then
    raise exception 'TEST FAILED: row not recorded against the caller';
  end if;
  if v_stat <> 'pending' then
    raise exception 'TEST FAILED: new row status is %, want pending', v_stat;
  end if;

  raise exception 'ALL TESTS PASSED (everything rolled back)';
end $t$;