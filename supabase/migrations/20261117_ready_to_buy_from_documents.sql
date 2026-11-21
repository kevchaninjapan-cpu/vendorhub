-- ============================================================================
-- Ready to buy, from documents
--
-- Before: listings_before_save set ready_to_buy when the seller ticked
-- lim_provided, title_provided and weathertightness_disclosed. Nothing had to
-- be uploaded, so the badge could be earned by ticking boxes.
--
-- Now ready_to_buy is true only when ALL of these hold:
--   * the weathertightness tick is set (there is no document for it), and
--   * a LIM is uploaded and its visibility is not 'private', and
--   * a record of title is uploaded and its visibility is not 'private'.
--
-- It is recalculated on every listing save (listings_before_save) AND whenever
-- a document is added, removed, or has its type or visibility changed
-- (trg_listing_docs_sync_ready), because uploading a document does not save
-- the listing.
--
-- UNDO (restores the tick-box rule). Run all of this:
--   drop trigger if exists trg_listing_docs_sync_ready on public.listing_documents;
--   drop function if exists public.listing_docs_sync_ready();
--   create or replace function public.listings_before_save()
--    returns trigger language plpgsql
--   as $function$
--   declare
--     d jsonb := coalesce(new.disclosures, '{}'::jsonb);
--   begin
--     if new.street_address is not null then
--       new.slug := slugify(new.street_address) || '-' || new.short_id;
--     end if;
--     new.search_rank_boost := case new.pack_tier
--       when 'starter' then 1.0
--       when 'pro'     then 1.5
--       when 'elite'   then 2.0
--     end;
--     new.ready_to_buy := coalesce((d->>'lim_provided')::boolean, false)
--                     and coalesce((d->>'title_provided')::boolean, false)
--                     and coalesce((d->>'weathertightness_disclosed')::boolean, false);
--     return new;
--   end $function$;
--   drop function if exists public.listing_ready_to_buy(uuid, jsonb);
-- ============================================================================

-- The rule, in one place. Runs with owner rights so it always sees the
-- documents, whoever is saving the listing.
create or replace function public.listing_ready_to_buy(p_listing_id uuid, p_disclosures jsonb)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce((p_disclosures ->> 'weathertightness_disclosed')::boolean, false)
     and exists (
       select 1 from listing_documents d
       where d.listing_id = p_listing_id and d.doc_type = 'lim' and d.visibility <> 'private')
     and exists (
       select 1 from listing_documents d
       where d.listing_id = p_listing_id and d.doc_type = 'title' and d.visibility <> 'private');
$fn$;

revoke execute on function public.listing_ready_to_buy(uuid, jsonb) from public, anon;
grant  execute on function public.listing_ready_to_buy(uuid, jsonb) to authenticated, service_role;

-- Same as before, except the ready_to_buy line. Slug and ranking are unchanged.
create or replace function public.listings_before_save()
returns trigger
language plpgsql
as $function$
declare
  d jsonb := coalesce(new.disclosures, '{}'::jsonb);
begin
  if new.street_address is not null then
    new.slug := slugify(new.street_address) || '-' || new.short_id;
  end if;

  new.search_rank_boost := case new.pack_tier
    when 'starter' then 1.0
    when 'pro'     then 1.5
    when 'elite'   then 2.0
  end;

  new.ready_to_buy := public.listing_ready_to_buy(new.id, d);

  return new;
end $function$;

-- Keep the badge right when documents change (uploads do not save the listing).
create or replace function public.listing_docs_sync_ready()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_listing uuid;
  v_disc    jsonb;
  v_old     boolean;
  v_new     boolean;
begin
  if tg_op = 'DELETE' then
    v_listing := old.listing_id;
  else
    v_listing := new.listing_id;
  end if;

  select ready_to_buy, coalesce(disclosures, '{}'::jsonb)
    into v_old, v_disc
  from listings where id = v_listing;

  -- The listing itself is being deleted (cascade): nothing to update.
  if not found then
    return null;
  end if;

  v_new := listing_ready_to_buy(v_listing, v_disc);

  if v_old is distinct from v_new then
    update listings set ready_to_buy = v_new where id = v_listing;
    -- The search view carries ready_to_buy. A failed refresh must never block
    -- an upload.
    begin
      perform refresh_listings_search();
    exception when others then
      raise warning 'search refresh skipped: %', sqlerrm;
    end;
  end if;

  return null;
end $fn$;

drop trigger if exists trg_listing_docs_sync_ready on public.listing_documents;
create trigger trg_listing_docs_sync_ready
  after insert or delete or update of doc_type, visibility on public.listing_documents
  for each row execute function public.listing_docs_sync_ready();

-- Recalculate existing listings (only the ones that change).
update public.listings l
set ready_to_buy = public.listing_ready_to_buy(l.id, coalesce(l.disclosures, '{}'::jsonb))
where l.ready_to_buy is distinct from
      public.listing_ready_to_buy(l.id, coalesce(l.disclosures, '{}'::jsonb));

do $do$
begin
  perform public.refresh_listings_search();
exception when others then
  raise warning 'search refresh skipped: %', sqlerrm;
end $do$;

notify pgrst, 'reload schema';

-- Result: how many listings carry the badge now.
select
  (select count(*) from public.listings where ready_to_buy) as ready_to_buy_listings,
  (select count(*) from public.listings)                    as total_listings;