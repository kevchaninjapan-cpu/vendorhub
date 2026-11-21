-- ============================================================================
-- submit_verification: check the document paths
--
-- UNDO (restores the original function exactly):
--   create or replace function public.submit_verification(p_id_doc_path text, p_id_doc_type text, p_address_proof_path text, p_selfie_path text, p_notes jsonb)
--    returns uuid language plpgsql security definer set search_path to 'public'
--   as $function$
--   declare
--     v_user_id uuid := auth.uid();
--     v_id uuid;
--   begin
--     if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
--     insert into verifications (
--       user_id, id_doc_path, id_doc_type, address_proof_path, selfie_path,
--       status, submitted_at, notes
--     ) values (
--       v_user_id, p_id_doc_path, p_id_doc_type, p_address_proof_path, p_selfie_path,
--       'pending', now(), p_notes->>'notes'
--     ) returning id into v_id;
--     insert into audit_log (actor_id, action, target_type, target_id, metadata)
--     values (v_user_id, 'verification_submitted', 'verification', v_id, p_notes);
--     return v_id;
--   end $function$;
-- ============================================================================

create or replace function public.submit_verification(
  p_id_doc_path        text,
  p_id_doc_type        text,
  p_address_proof_path text,
  p_selfie_path        text,
  p_notes              jsonb
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_id      uuid;
  v_prefix  text;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;

  if coalesce(p_id_doc_path, '') = '' or coalesce(p_address_proof_path, '') = '' then
    raise exception 'Please upload both your ID and proof of address.'
      using errcode = '22023';
  end if;

  -- Every document must be in the caller's own folder.
  v_prefix := v_user_id::text || '/';

  if left(p_id_doc_path, length(v_prefix)) <> v_prefix
     or left(p_address_proof_path, length(v_prefix)) <> v_prefix
     or (coalesce(p_selfie_path, '') <> ''
         and left(p_selfie_path, length(v_prefix)) <> v_prefix)
     or p_id_doc_path like '%..%'
     or p_address_proof_path like '%..%'
     or coalesce(p_selfie_path, '') like '%..%' then
    raise exception 'Documents must be uploaded to your own folder.'
      using errcode = '42501';
  end if;

  insert into verifications (
    user_id, id_doc_path, id_doc_type,
    address_proof_path, selfie_path,
    status, submitted_at, notes
  ) values (
    v_user_id, p_id_doc_path, p_id_doc_type,
    p_address_proof_path, nullif(p_selfie_path, ''),
    'pending', now(), p_notes->>'notes'
  ) returning id into v_id;

  insert into audit_log (actor_id, action, target_type, target_id, metadata)
  values (v_user_id, 'verification_submitted', 'verification', v_id, p_notes);

  return v_id;
end $function$;

-- Signed-out visitors have no business calling either function.
revoke execute on function public.submit_verification(text, text, text, text, jsonb) from public, anon;
grant  execute on function public.submit_verification(text, text, text, text, jsonb) to authenticated, service_role;

revoke execute on function public.review_verification(uuid, boolean, text) from public, anon;
grant  execute on function public.review_verification(uuid, boolean, text) to authenticated, service_role;

notify pgrst, 'reload schema';

-- Check: want true for the new function, and anon_can_call = false for both.
select
  prosrc like '%your own folder%'                                      as has_path_check,
  has_function_privilege('anon', p.oid, 'execute')                     as anon_can_call,
  p.proname
from pg_proc p
where p.proname in ('submit_verification', 'review_verification');