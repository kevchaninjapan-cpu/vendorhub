-- ============================================================================
-- VendorHub Marketplace — storage buckets + policies (idempotent)
-- Buckets:
--   listing-media        (public read; owner writes under {userId}/...)
--   listing-disclosures  (owner read+write only)
--   verifications        (insert by owner; read only via service role)
-- ============================================================================

-- Buckets
insert into storage.buckets (id, name, public)
values ('listing-media', 'listing-media', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('listing-disclosures', 'listing-disclosures', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('verifications', 'verifications', false)
on conflict (id) do nothing;

-- ---------- listing-media policies ----------------------------------------
drop policy if exists "listing-media public read"  on storage.objects;
drop policy if exists "listing-media owner write"  on storage.objects;
drop policy if exists "listing-media owner update" on storage.objects;
drop policy if exists "listing-media owner delete" on storage.objects;

create policy "listing-media public read" on storage.objects
  for select using (bucket_id = 'listing-media');

create policy "listing-media owner write" on storage.objects
  for insert with check (
    bucket_id = 'listing-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "listing-media owner update" on storage.objects
  for update using (
    bucket_id = 'listing-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "listing-media owner delete" on storage.objects
  for delete using (
    bucket_id = 'listing-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---------- listing-disclosures (owner only) ------------------------------
drop policy if exists "disclosures owner all" on storage.objects;
create policy "disclosures owner all" on storage.objects
  for all using (
    bucket_id = 'listing-disclosures'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'listing-disclosures'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---------- verifications (owner insert only; reads via service role) -----
drop policy if exists "verifications owner write" on storage.objects;
create policy "verifications owner write" on storage.objects
  for insert with check (
    bucket_id = 'verifications'
    and auth.uid()::text = (storage.foldername(name))[1]
  );