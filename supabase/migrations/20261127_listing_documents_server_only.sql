-- ============================================================================
-- PHASE B - listing documents: no direct reads except owner and admin.
--
-- RUN ONLY AFTER the code from this installer is pushed and the Vercel
-- deployment shows Ready. Until then the live site still reads this table
-- directly, and the document list would go blank.
--
-- Before: any visitor could read every live listing's non-private document
-- rows, including file paths and uploader ids. The listing page now reads
-- the list with the server-only key and never sends file paths.
--
-- UNDO:
--   create policy listing_documents_public_read on public.listing_documents
--     for select using (visibility <> 'private' and is_listing_public(listing_id));
--   grant select (id, listing_id, doc_type, visibility, file_name, file_size,
--     mime_type, label, created_at, updated_at) on public.listing_documents to anon;
-- ============================================================================

drop policy if exists listing_documents_public_read on public.listing_documents;
revoke select on table public.listing_documents from anon;

notify pgrst, 'reload schema';

select
  has_table_privilege('anon', 'public.listing_documents', 'select')                  as anon_can_read,
  has_column_privilege('anon', 'public.listing_documents', 'file_name', 'select')     as anon_can_read_names,
  (select count(*) from pg_policies where tablename = 'listing_documents')            as policies_left;