-- ============================================================================
-- Cleanup — duplicate policies, legacy function overload, orphaned storage
--
-- Created 2026-09-14 following the schema audit. Unlike the sprint3a
-- backfills, this file CHANGES production. Read every section before running.
--
-- Run it once, in order, against a database that already matches the
-- backfilled migrations.
-- ============================================================================

-- ─── 1. Remove the legacy is_admin(uuid) overload ───────────────────────────
--
-- Production has two overloads reading DIFFERENT columns:
--
--   is_admin()      -> profiles.role in ('moderator','admin')   [DEFINER]
--   is_admin(uuid)  -> profiles.is_admin boolean                [not DEFINER]
--
-- Every RLS policy calls the no-arg form, so `role` is the effective source of
-- truth. The uuid overload is a second, divergent answer to "is this user an
-- admin" and a privilege-escalation risk if anything calls it.
--
-- Confirm nothing depends on it before dropping:
--   select proname, pg_get_functiondef(oid) from pg_proc
--   where proname = 'is_admin';

drop function if exists public.is_admin(uuid);

-- The legacy profiles.is_admin boolean column is now unreferenced. It is NOT
-- dropped here — verify no application code reads it first, then drop in a
-- follow-up:
--
--   alter table public.profiles drop column if exists is_admin;

-- ─── 2. Collapse duplicate profiles policies ────────────────────────────────
--
-- Nine policies existed: five SELECT, four UPDATE, three INSERT, largely
-- restating each other. Policies are OR'd, so the most permissive always won
-- and the rest were dead weight — worse, they would have silently defeated
-- any future attempt to tighten access.
--
-- Canonical set (created by the sprint3a_rls migration) is retained:
--   profiles_self_read    SELECT  auth.uid() = id OR is_admin()
--   profiles_self_update  UPDATE  auth.uid() = id
--   profiles_admin_update UPDATE  is_admin()

drop policy if exists "Profiles are viewable by owner"   on public.profiles;
drop policy if exists "Users can read own profile"       on public.profiles;
drop policy if exists "read own profile"                 on public.profiles;
drop policy if exists "update own profile"               on public.profiles;
drop policy if exists "Profiles can be updated by owner" on public.profiles;

-- Insert policies: keep one, drop the duplicates.
drop policy if exists "Profiles can be inserted by owner" on public.profiles;
drop policy if exists "upsert own profile"                on public.profiles;

drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles
  for insert
  with check (auth.uid() = id);

-- ─── 3. Add the missing WITH CHECK on offers ────────────────────────────────
--
-- The update policy had USING but no WITH CHECK, so a participant could move a
-- row into a state that no longer satisfied the policy. Latent rather than
-- live, since all writes go through SECURITY DEFINER RPCs — but the gap should
-- not survive the first direct write.

drop policy if exists offers_participant_update on public.offers;
create policy offers_participant_update on public.offers
  for update
  using (
    auth.uid() = buyer_id
    or exists (
      select 1 from listings l
      where l.id = offers.listing_id and l.member_id = auth.uid()
    )
  )
  with check (
    auth.uid() = buyer_id
    or exists (
      select 1 from listings l
      where l.id = offers.listing_id and l.member_id = auth.uid()
    )
  );

-- ─── 4. Drop the duplicate storage policy ───────────────────────────────────
-- "verifications owner write" duplicates verifications_owner_insert exactly.

drop policy if exists "verifications owner write" on storage.objects;

-- ─── 5. Remove the legacy verification bucket ───────────────────────────────
--
-- PRIVACY ACTION — READ BEFORE RUNNING.
--
-- 'verification-documents' holds 54 objects uploaded 15–27 April 2026 by the
-- retired onboarding flow. They are identity documents: ID scans and proof of
-- address belonging to real people.
--
-- They are fully orphaned. This returns zero:
--
--   select count(*) from verifications
--   where id_doc_path is not null
--      or address_proof_path is not null
--      or selfie_path is not null;
--
-- No verification record points at them, so they cannot be matched to a person
-- through the application and have no operational value. Privacy Act 2020
-- principle 9 requires personal information not be kept beyond the purpose it
-- was collected for.
--
-- Deleting is therefore the correct action, not migrating. Re-run the count
-- above immediately before executing, and record the object count removed.
--
-- The live bucket is 'verifications' (4 objects, July 2026) — do not confuse
-- the two.

-- Supabase blocks direct SQL deletes on storage.objects/storage.buckets
-- (storage.protect_delete()). This section was executed via the Storage API
-- on 2026-09-14, not via SQL:
--   54 objects deleted from 'verification-documents'
--   0 referencing rows in verifications (confirmed before deletion)
--   bucket 'verification-documents' deleted
-- Left here for the audit trail. Do not attempt the SQL delete below on a
-- fresh database -- it will fail. Use the Storage API or dashboard instead.

drop policy if exists "Users can read their own verification docs"   on storage.objects;
drop policy if exists "Users can upload their own verification docs" on storage.objects;

-- ─── 6. Remove unused listing buckets ───────────────────────────────────────
--
-- 'listing-images' — empty, no code references it. Its SELECT policy checked
-- only bucket_id despite the "Auth users" name, so any authenticated user
-- could read anything in it. Dropping removes the exposure.

-- storage.buckets cannot be deleted via SQL (storage.protect_delete()).
-- Delete via Storage API or dashboard once objects are confirmed empty:
--   select count(*) from storage.objects where bucket_id = 'listing-images';
drop policy if exists "Auth users can read from listing-images"   on storage.objects;
drop policy if exists "Auth users can upload to listing-images"   on storage.objects;

-- 'listing-photos' — public bucket, ONE object from 24 March 2026, no code
-- references it. Its admin policies also inline `profiles.role = 'admin'`
-- rather than calling is_admin(), so moderators were silently excluded.
--
-- CHECK FIRST that the single object is not referenced by a live listing:
--
--   select name, created_at from storage.objects
--   where bucket_id = 'listing-photos';
--
-- Then uncomment:
--
-- delete from storage.objects where bucket_id = 'listing-photos';
-- delete from storage.buckets where id = 'listing-photos';
-- drop policy if exists "public read listing photos"   on storage.objects;
-- drop policy if exists "Admin upload listing photos"  on storage.objects;
-- drop policy if exists "Admin delete listing photos"  on storage.objects;
-- drop policy if exists "upload to user folder"        on storage.objects;
-- drop policy if exists "update own files"             on storage.objects;
-- drop policy if exists "delete own files"             on storage.objects;

-- 'listing-disclosures' is deliberately KEPT. It is empty and unwritten, but
-- correctly configured owner-scoped private storage, and is the bucket the
-- pending document service will use.

notify pgrst, 'reload schema';

-- ============================================================================
-- AFTER RUNNING, verify:
--
--   select policyname, cmd from pg_policies
--   where schemaname = 'public' and tablename = 'profiles';
--   -- expect 4: self_read, self_update, admin_update, self_insert
--
--   select proname, pronargs from pg_proc where proname = 'is_admin';
--   -- expect 1 row, pronargs = 0
--
--   select id, public from storage.buckets order by id;
--   -- expect: listing-disclosures, listing-media, verifications
--   --         (+ listing-photos if section 6 was left commented)
-- ============================================================================
