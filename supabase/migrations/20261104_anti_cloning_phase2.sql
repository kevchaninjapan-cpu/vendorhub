-- ============================================================================
-- Anti-cloning phase 2 - closes direct database reads of listings
--
-- RUN ONLY AFTER:
--   1. the installer reported "No remaining public-key readers", and
--   2. signed OUT, these all load correctly: /buy, /buy/auckland, a suburb
--      page, a listing page (photos, map, documents, open homes) and
--      /sitemap.xml
--
-- To undo: re-grant with
--   grant select on public.listings_search to anon, authenticated;
--   grant select on public.listings to anon;
--   grant select on public.listing_media, public.suburbs to anon;
--   grant execute on function public.marketplace_listing_by_slug(text),
--     public.marketplace_listings_geom(uuid[]),
--     public.marketplace_suburb_summary(text) to anon, authenticated;
-- ============================================================================

-- Search view: had every live listing's location, prices and valuation.
revoke all on table public.listings_search from anon, authenticated;

-- Listing functions are now only called by the server.
revoke execute on function public.marketplace_listing_by_slug(text) from public, anon, authenticated;
revoke execute on function public.marketplace_listings_geom(uuid[]) from public, anon, authenticated;
revoke execute on function public.marketplace_suburb_summary(text) from public, anon, authenticated;
grant  execute on function public.marketplace_listing_by_slug(text) to service_role;
grant  execute on function public.marketplace_listings_geom(uuid[]) to service_role;
grant  execute on function public.marketplace_suburb_summary(text) to service_role;

-- Signed-out visitors: only the listing columns that other access rules and
-- the viewing-request card need. Descriptions, prices, addresses and
-- valuations can no longer be pulled through the database API.
revoke select on table public.listings from anon;
grant  select (id, member_id, status, accepts_viewing_requests) on table public.listings to anon;

-- Photos and suburbs are served by the server.
revoke select on table public.listing_media from anon;
revoke select on table public.suburbs from anon;

notify pgrst, 'reload schema';

-- ---- Check (should show false, false, false, true) --------------------------
select
  has_table_privilege('anon', 'public.listings_search', 'select')                        as search_view_open,
  has_column_privilege('anon', 'public.listings', 'description', 'select')               as descriptions_open,
  has_function_privilege('anon', 'public.marketplace_listing_by_slug(text)', 'execute')  as listing_fn_open,
  has_column_privilege('anon', 'public.listings', 'status', 'select')                    as status_still_readable;