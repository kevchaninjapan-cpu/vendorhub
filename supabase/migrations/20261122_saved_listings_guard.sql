-- ============================================================================
-- Saved listings guard. Safe to run more than once.
--
-- Buyers save homes straight from the listing page (SaveButton). The row
-- rule only checked the row was theirs, so any listing id could be saved,
-- including drafts. Now only live or under-offer listings can be saved.
-- Server code, staff and the SQL Editor are not restricted.
--
-- UNDO:
--   drop trigger if exists trg_saved_listings_guard on public.saved_listings;
--   drop function if exists public.saved_listings_guard();
-- ============================================================================

create or replace function public.saved_listings_guard()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if not is_listing_public(new.listing_id) then
    raise exception 'This home is not available to save.' using errcode = '42501';
  end if;
  return new;
end $fn$;

drop trigger if exists trg_saved_listings_guard on public.saved_listings;
create trigger trg_saved_listings_guard
  before insert or update of listing_id on public.saved_listings
  for each row execute function public.saved_listings_guard();

revoke all on table public.saved_listings from anon;

notify pgrst, 'reload schema';

-- Check: the trigger exists; anon can't touch the table.
select
  exists (select 1 from pg_trigger where tgname = 'trg_saved_listings_guard') as guard_installed,
  has_table_privilege('anon', 'public.saved_listings', 'insert') as anon_can_insert;