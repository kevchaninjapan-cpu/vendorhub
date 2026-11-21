-- ============================================================================
-- ID document retention: delete files 30 days after a decision
-- Safe to run more than once.
--
-- The files themselves are deleted by the daily job
-- /api/cron/purge-verification-docs through the Storage API, because
-- Supabase blocks deleting storage files with SQL. These functions tell the
-- job what is due and record what was deleted. All are server-only.
--
-- UNDO:
--   drop trigger if exists trg_verifications_decided_at on public.verifications;
--   drop function if exists public.verifications_set_decided_at();
--   drop function if exists public.verification_docs_due(integer, integer);
--   drop function if exists public.mark_verification_docs_deleted(uuid);
--   drop function if exists public.verification_orphan_files(integer, integer);
--   (the two new columns can stay; they are harmless)
-- ============================================================================

alter table public.verifications
  add column if not exists decided_at           timestamptz,
  add column if not exists documents_deleted_at timestamptz;

-- Backfill: checks already decided. Approvals have verified_at; rejections
-- don't, so their last update time is used.
update public.verifications
set decided_at = coalesce(verified_at, updated_at, created_at)
where status::text in ('approved', 'rejected') and decided_at is null;

-- Stamp the decision time whenever a check is approved or rejected.
create or replace function public.verifications_set_decided_at()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  if new.status::text in ('approved', 'rejected')
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    new.decided_at := now();
  elsif new.status::text = 'pending' then
    new.decided_at := null;
  end if;
  return new;
end $fn$;

drop trigger if exists trg_verifications_decided_at on public.verifications;
create trigger trg_verifications_decided_at
  before insert or update of status on public.verifications
  for each row execute function public.verifications_set_decided_at();

-- Checks whose files are due for deletion.
create or replace function public.verification_docs_due(p_days integer default 30, p_limit integer default 200)
returns table (id uuid, user_id uuid, paths text[])
language sql
stable
security definer
set search_path = public
as $fn$
  select v.id, v.user_id,
         array_remove(array[nullif(v.id_doc_path, ''), nullif(v.address_proof_path, ''), nullif(v.selfie_path, '')], null)
  from verifications v
  where v.status::text in ('approved', 'rejected')
    and v.documents_deleted_at is null
    and v.decided_at is not null
    and v.decided_at < now() - make_interval(days => p_days)
  order by v.decided_at
  limit p_limit;
$fn$;

-- Called after the files are deleted: clears the paths, keeps the result.
create or replace function public.mark_verification_docs_deleted(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  update verifications
  set id_doc_path = null,
      address_proof_path = null,
      selfie_path = null,
      id_doc_meta = '{}'::jsonb,
      address_doc_meta = '{}'::jsonb,
      selfie_meta = '{}'::jsonb,
      documents_deleted_at = now()
  where id = p_id and documents_deleted_at is null;

  if found then
    insert into audit_log (actor_id, action, target_type, target_id, metadata)
    values (null, 'verification_documents_deleted', 'verification', p_id,
            jsonb_build_object('reason', 'retention_30_days'));
  end if;
end $fn$;

-- ID files older than the retention period that no current check points to
-- (for example, files uploaded but never submitted).
create or replace function public.verification_orphan_files(p_days integer default 30, p_limit integer default 500)
returns table (name text)
language sql
stable
security definer
set search_path = public, storage
as $fn$
  select o.name
  from storage.objects o
  where o.bucket_id = 'verifications'
    and o.created_at < now() - make_interval(days => p_days)
    and not exists (
      select 1 from public.verifications v
      where v.documents_deleted_at is null
        and o.name in (v.id_doc_path, v.address_proof_path, v.selfie_path))
  order by o.created_at
  limit p_limit;
$fn$;

revoke execute on function public.verification_docs_due(integer, integer) from public, anon, authenticated;
revoke execute on function public.mark_verification_docs_deleted(uuid) from public, anon, authenticated;
revoke execute on function public.verification_orphan_files(integer, integer) from public, anon, authenticated;
grant  execute on function public.verification_docs_due(integer, integer) to service_role;
grant  execute on function public.mark_verification_docs_deleted(uuid) to service_role;
grant  execute on function public.verification_orphan_files(integer, integer) to service_role;

notify pgrst, 'reload schema';

-- Check: what the first run will do.
select
  (select count(*) from public.verification_docs_due(30, 1000))     as checks_due_now,
  (select count(*) from public.verification_orphan_files(30, 1000)) as orphan_files_now,
  (select count(*) from public.verifications where status::text = 'pending') as pending_untouched;