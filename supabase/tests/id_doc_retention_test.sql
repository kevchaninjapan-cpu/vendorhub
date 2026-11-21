-- Test for ID document retention.
--
-- Run in the Supabase SQL Editor as postgres, in a NEW tab, then Ctrl+A and
-- Ctrl+Enter. Copy it from this file, not from chat. Run the migration first.
--
-- EVERYTHING IS ROLLED BACK. The block always ends in an error:
--   ERROR: ALL TESTS PASSED (everything rolled back)   <- pass
--   ERROR: TEST FAILED: ...                            <- real failure
--   ERROR: SETUP FAILED: ...                           <- couldn't run

do $t$
declare
  u  uuid;
  v1 uuid;
  v2 uuid;
  v3 uuid;
  r  record;
  n  integer;
begin
  select id into u from public.profiles order by id limit 1;
  if u is null then raise exception 'SETUP FAILED: no profile to test with'; end if;

  insert into public.verifications (user_id, status, id_doc_path, address_proof_path)
  values (u, 'approved', u::text || '/test-id-old.png', u::text || '/test-addr-old.png')
  returning id into v1;
  insert into public.verifications (user_id, status, id_doc_path, address_proof_path)
  values (u, 'rejected', u::text || '/test-id-new.png', u::text || '/test-addr-new.png')
  returning id into v2;
  insert into public.verifications (user_id, status, id_doc_path, address_proof_path)
  values (u, 'pending', u::text || '/test-id-pend.png', u::text || '/test-addr-pend.png')
  returning id into v3;

  -- 1. The decision time is stamped automatically; pending has none.
  if (select decided_at from public.verifications where id = v1) is null then
    raise exception 'TEST FAILED: decided_at not set when approved';
  end if;
  if (select decided_at from public.verifications where id = v3) is not null then
    raise exception 'TEST FAILED: a pending check has decided_at';
  end if;

  update public.verifications set decided_at = now() - interval '40 days' where id = v1;
  update public.verifications set decided_at = now() - interval '10 days' where id = v2;
  update public.verifications set created_at = now() - interval '90 days' where id = v3;

  -- 2. Only the check decided more than 30 days ago is due.
  if not exists (select 1 from public.verification_docs_due(30, 10000) d where d.id = v1) then
    raise exception 'TEST FAILED: a check decided 40 days ago is not due';
  end if;
  if exists (select 1 from public.verification_docs_due(30, 10000) d where d.id = v2) then
    raise exception 'TEST FAILED: a check decided 10 days ago is due';
  end if;
  if exists (select 1 from public.verification_docs_due(30, 10000) d where d.id = v3) then
    raise exception 'TEST FAILED: a pending check is due';
  end if;
  select array_length(d.paths, 1) into n from public.verification_docs_due(30, 10000) d where d.id = v1;
  if n is distinct from 2 then
    raise exception 'TEST FAILED: expected 2 file paths, got %', n;
  end if;

  -- 3. Marking clears the paths, keeps the result, and logs it.
  perform public.mark_verification_docs_deleted(v1);
  select * into r from public.verifications where id = v1;
  if r.id_doc_path is not null or r.address_proof_path is not null or r.documents_deleted_at is null then
    raise exception 'TEST FAILED: paths not cleared after deletion';
  end if;
  if r.status::text <> 'approved' then
    raise exception 'TEST FAILED: the check result changed (now %)', r.status;
  end if;
  if not exists (select 1 from public.audit_log
                 where target_id = v1 and action = 'verification_documents_deleted') then
    raise exception 'TEST FAILED: deletion not logged';
  end if;
  if exists (select 1 from public.verification_docs_due(30, 10000) d where d.id = v1) then
    raise exception 'TEST FAILED: still due after deletion';
  end if;

  -- 4. Users can't call any of the retention functions.
  if has_function_privilege('authenticated', 'public.verification_docs_due(integer,integer)', 'execute')
     or has_function_privilege('authenticated', 'public.mark_verification_docs_deleted(uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.verification_orphan_files(integer,integer)', 'execute')
     or has_function_privilege('anon', 'public.mark_verification_docs_deleted(uuid)', 'execute') then
    raise exception 'TEST FAILED: a retention function can be called by users';
  end if;

  raise exception 'ALL TESTS PASSED (everything rolled back)';
end $t$;