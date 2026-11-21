-- ============================================================================
-- Verification guard
--
-- Before: the insert rule on verifications only checked user_id = auth.uid().
-- It said nothing about status, so a signed-in user could insert their own row
-- with status = 'approved' through the public key, skipping ID verification
-- and unlocking offers and document downloads.
--
-- Now, for rows created by a signed-in user directly:
--   * status must be 'pending', and verified_at / verified_by must be empty
--   * document paths must be in the user's own folder ("<user id>/...")
--
-- Not restricted: moderators and admins, server code, owner-rights functions
-- (review_verification), and the SQL Editor. Updates and deletes by ordinary
-- users are already refused by the row-level rules, so the trigger covers
-- inserts only.
--
-- UNDO:
--   drop trigger if exists trg_verifications_guard on public.verifications;
--   drop function if exists public.verifications_guard();
-- ============================================================================

create or replace function public.verifications_guard()
returns trigger
language plpgsql
set search_path = public
as $fn$
declare
  v_prefix text;
begin
  -- Server code, owner-rights functions and the SQL Editor run as other roles.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  -- Moderators and admins can write anything.
  if is_admin() then
    return new;
  end if;

  if coalesce(new.status::text, 'pending') <> 'pending'
     or new.verified_at is not null
     or new.verified_by is not null then
    raise exception 'A verification can only be approved or rejected by VendorHub staff.'
      using errcode = '42501';
  end if;

  v_prefix := auth.uid()::text || '/';

  if (new.id_doc_path is not null
        and left(new.id_doc_path, length(v_prefix)) <> v_prefix)
     or (new.address_proof_path is not null
        and left(new.address_proof_path, length(v_prefix)) <> v_prefix)
     or (new.selfie_path is not null and new.selfie_path <> ''
        and left(new.selfie_path, length(v_prefix)) <> v_prefix) then
    raise exception 'Documents must be uploaded to your own folder.'
      using errcode = '42501';
  end if;

  return new;
end $fn$;

drop trigger if exists trg_verifications_guard on public.verifications;
create trigger trg_verifications_guard
  before insert on public.verifications
  for each row execute function public.verifications_guard();

-- Signed-out visitors have no business with this table.
revoke all on table public.verifications from anon;

notify pgrst, 'reload schema';

-- Check 1: the trigger exists.
select tgname as verification_triggers
from pg_trigger
where tgrelid = 'public.verifications'::regclass and not tgisinternal
order by tgname;

-- Check 2: does submit_verification run with the owner's rights?
select proname, prosecdef as runs_with_owner_rights
from pg_proc
where proname in ('submit_verification', 'review_verification');