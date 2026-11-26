-- ============================================================================
-- PHASE A - listing photos: owner (and admin) only. Safe to run now.
--
-- Before: any signed-in user could read every live listing's photo rows
-- (public addresses and storage paths). The public pages read photos with
-- the server-only key, so they are not affected. Sellers keep their own
-- photos (listing_media_owner_write) and admins keep listing_media_admin_read.
--
-- UNDO:
--   create policy listing_media_read on public.listing_media for select
--     using (is_listing_public(listing_id)
--            or exists (select 1 from listings l where l.id = listing_media.listing_id and l.member_id = auth.uid()));
-- ============================================================================

drop policy if exists listing_media_read on public.listing_media;

notify pgrst, 'reload schema';

select policyname, cmd from pg_policies
where tablename = 'listing_media' order by policyname;