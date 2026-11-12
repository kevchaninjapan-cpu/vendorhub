-- ============================================================================
-- Document download counts for sellers
--
-- Sellers cannot read audit_log (admin-only RLS), so this SECURITY DEFINER
-- function returns per-document counts of distinct BUYERS who downloaded.
-- The seller's own views and admin views are excluded. No identities returned.
--
-- Note: counts are per document id. When a LIM or title is replaced, the new
-- document starts at zero.
-- ============================================================================

create or replace function public.get_document_download_counts(p_listing_id uuid)
returns table (document_id uuid, buyer_downloads bigint)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
begin
  if not exists (
    select 1 from listings
    where id = p_listing_id and member_id = auth.uid()
  ) and not is_admin() then
    raise exception 'NOT_LISTING_OWNER';
  end if;

  return query
  select d.id, count(distinct a.actor_id)
  from listing_documents d
  left join audit_log a
    on a.target_type = 'listing_document'
   and a.target_id = d.id
   and a.action = 'document_downloaded'
   and a.metadata->>'as' = 'buyer'
  where d.listing_id = p_listing_id
  group by d.id;
end $function$;

grant execute on function public.get_document_download_counts(uuid) to authenticated;

create index if not exists idx_audit_log_target on public.audit_log (target_type, target_id);

notify pgrst, 'reload schema';