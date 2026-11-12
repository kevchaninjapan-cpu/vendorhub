-- ============================================================================
-- Sprint 3a — RLS policies and storage
--
-- BACKFILLED from the live database on 2026-09-14 and corrected against
-- pg_policies output for both the public and storage schemas.
--
-- Canonical verification bucket is 'verifications' — confirmed by
-- VerifyForm.tsx, which uploads to it with paths keyed "<user_id>/<kind>-...".
-- The legacy 'verification-documents' bucket is NOT recreated here; it is
-- dropped in the cleanup migration.
--
-- Policies are dropped by name and recreated, so this file is re-runnable.
-- ============================================================================

alter table public.offers        enable row level security;
alter table public.verifications enable row level security;
alter table public.audit_log     enable row level security;

-- ─── offers ─────────────────────────────────────────────────────────────────
-- Seller is resolved through listings.member_id rather than stored on the row.

drop policy if exists offers_participants on public.offers;
create policy offers_participants on public.offers
  for select
  using (
    auth.uid() = buyer_id
    or exists (
      select 1 from listings l
      where l.id = offers.listing_id
        and l.member_id = auth.uid()
    )
  );

drop policy if exists offers_buyer_insert on public.offers;
create policy offers_buyer_insert on public.offers
  for insert
  with check (auth.uid() = buyer_id);

drop policy if exists offers_participant_update on public.offers;
create policy offers_participant_update on public.offers
  for update
  using (
    auth.uid() = buyer_id
    or exists (
      select 1 from listings l
      where l.id = offers.listing_id
        and l.member_id = auth.uid()
    )
  );

-- NOTE: no WITH CHECK on the update policy, so a participant could in
-- principle move a row into a state outside the policy. Latent only — every
-- write goes through a SECURITY DEFINER RPC. Addressed in cleanup.

-- ─── verifications ──────────────────────────────────────────────────────────

drop policy if exists verifications_owner_read on public.verifications;
create policy verifications_owner_read on public.verifications
  for select
  using (auth.uid() = user_id);

drop policy if exists verifications_owner_insert on public.verifications;
create policy verifications_owner_insert on public.verifications
  for insert
  with check (auth.uid() = user_id);

drop policy if exists verifications_admin_read on public.verifications;
create policy verifications_admin_read on public.verifications
  for select
  using (is_admin());

drop policy if exists verifications_admin_update on public.verifications;
create policy verifications_admin_update on public.verifications
  for update
  using (is_admin())
  with check (is_admin());

-- ─── listings ───────────────────────────────────────────────────────────────
-- Admin visibility arrived with the moderation queue in this sprint. The owner
-- and public-read policies originate in marketplace_init and are restated so
-- the set is complete.

drop policy if exists listings_public_read on public.listings;
create policy listings_public_read on public.listings
  for select
  using (status in ('live', 'under_offer'));

drop policy if exists listings_owner_all on public.listings;
create policy listings_owner_all on public.listings
  for all
  using (auth.uid() = member_id)
  with check (auth.uid() = member_id);

drop policy if exists listings_admin_read on public.listings;
create policy listings_admin_read on public.listings
  for select
  using (is_admin());

drop policy if exists listings_admin_update on public.listings;
create policy listings_admin_update on public.listings
  for update
  using (is_admin())
  with check (is_admin());

-- ─── profiles ───────────────────────────────────────────────────────────────
--
-- Production has NINE overlapping policies here (five SELECT, four UPDATE),
-- accumulated across sprints. Policies are OR'd, so the most permissive wins
-- and the duplicates are dead weight that also makes any future tightening
-- ineffective while they remain.
--
-- Only the canonical set is created here; the duplicates are dropped by name
-- in the cleanup migration so this file stays descriptive of Sprint 3a.

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select
  using (auth.uid() = id or is_admin());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update
  using (is_admin())
  with check (is_admin());

-- ─── audit_log ──────────────────────────────────────────────────────────────
-- No INSERT policy by design: every write comes from a SECURITY DEFINER RPC,
-- which bypasses RLS. Clients can never write audit rows directly.

drop policy if exists audit_log_admin_read on public.audit_log;
create policy audit_log_admin_read on public.audit_log
  for select
  using (is_admin());

-- ─── Storage: verification documents ────────────────────────────────────────
--
-- Private bucket. VerifyForm.tsx writes paths of the form
-- "<user_id>/<kind>-<timestamp>-<filename>", so the first path segment
-- identifies the owner and drives every policy below.

insert into storage.buckets (id, name, public)
values ('verifications', 'verifications', false)
on conflict (id) do nothing;

drop policy if exists verifications_owner_insert on storage.objects;
create policy verifications_owner_insert on storage.objects
  for insert
  with check (
    bucket_id = 'verifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists verifications_owner_read on storage.objects;
create policy verifications_owner_read on storage.objects
  for select
  using (
    bucket_id = 'verifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists verifications_owner_delete on storage.objects;
create policy verifications_owner_delete on storage.objects
  for delete
  using (
    bucket_id = 'verifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists verifications_admin_read on storage.objects;
create policy verifications_admin_read on storage.objects
  for select
  using (bucket_id = 'verifications' and is_admin());

-- Production also has "verifications owner write" (with spaces), which
-- duplicates verifications_owner_insert exactly. Not recreated; dropped in
-- the cleanup migration.

-- No UPDATE policy: submitted KYC documents are immutable from the client.

-- ─── Storage: listing media ─────────────────────────────────────────────────
-- The only listing bucket in active use — Step3Media.tsx and
-- lib/listings/actions.ts both read and write it. Public read so published
-- galleries can be served without signed URLs.

insert into storage.buckets (id, name, public)
values ('listing-media', 'listing-media', true)
on conflict (id) do nothing;

drop policy if exists "listing-media public read" on storage.objects;
create policy "listing-media public read" on storage.objects
  for select
  using (bucket_id = 'listing-media');

drop policy if exists "listing-media owner write" on storage.objects;
create policy "listing-media owner write" on storage.objects
  for insert
  with check (
    bucket_id = 'listing-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "listing-media owner update" on storage.objects;
create policy "listing-media owner update" on storage.objects
  for update
  using (
    bucket_id = 'listing-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "listing-media owner delete" on storage.objects;
create policy "listing-media owner delete" on storage.objects
  for delete
  using (
    bucket_id = 'listing-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── Storage: listing disclosures ───────────────────────────────────────────
-- Private, owner-scoped, and currently unwritten — no code references it.
-- Retained deliberately: this is the bucket the pending document service
-- (Phase 1 debt) will use, and the policy shape is already correct.

insert into storage.buckets (id, name, public)
values ('listing-disclosures', 'listing-disclosures', false)
on conflict (id) do nothing;

drop policy if exists "disclosures owner all" on storage.objects;
create policy "disclosures owner all" on storage.objects
  for all
  using (
    bucket_id = 'listing-disclosures'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'listing-disclosures'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

notify pgrst, 'reload schema';
