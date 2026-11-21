-- ============================================================================
-- Listing delete guard
--
-- All nine tables that reference a listing are ON DELETE CASCADE, so deleting
-- a listing also deletes its offers, viewings, viewing requests, documents,
-- conversations, photos, open homes, saved-listing rows and view counts. A
-- seller could do that through the public key with one request.
--
-- A seller may now delete a listing ONLY when it is a draft AND it has no
-- offers, viewings, viewing requests or conversations. Anything else has to
-- be withdrawn, which keeps the history.
--
-- Not restricted: moderators and admins, server code, owner-rights database
-- functions, and the SQL Editor.
--
-- Note: deleting a draft removes its photo and document rows, but the files
-- stay in storage. They are orphaned and unreachable (nothing links to
-- them). Clearing them is a separate clean-up job.
--
-- UNDO:
--   drop trigger if exists trg_listings_00_guard_delete on public.listings;
--   drop function if exists public.listings_guard_delete();
--   drop function if exists public.listing_has_activity(uuid);
-- ============================================================================

-- Does this listing have anything a delete would destroy that matters?
-- Runs with owner rights so row-level rules can't hide activity from it.
-- It only answers for the listing's own seller: for anyone else it says
-- "yes", so it can't be used to probe other people's listings.
create or replace function public.listing_has_activity(p_listing_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $fn$
begin
  if not exists (
    select 1 from listings where id = p_listing_id and member_id = auth.uid()
  ) then
    return true;
  end if;

  return exists (select 1 from offers where listing_id = p_listing_id)
      or exists (select 1 from viewings where listing_id = p_listing_id)
      or exists (select 1 from viewing_requests where listing_id = p_listing_id)
      or exists (select 1 from listing_conversations where listing_id = p_listing_id);
end $fn$;

revoke execute on function public.listing_has_activity(uuid) from public, anon;
grant  execute on function public.listing_has_activity(uuid) to authenticated;

create or replace function public.listings_guard_delete()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  -- Server code, owner-rights functions and the SQL Editor run as other roles.
  if current_user not in ('authenticated', 'anon') then
    return old;
  end if;

  -- Moderators and admins can delete anything.
  if is_admin() then
    return old;
  end if;

  if old.status <> 'draft' then
    raise exception 'Only a draft listing can be deleted. Withdraw this listing instead.'
      using errcode = '42501';
  end if;

  if listing_has_activity(old.id) then
    raise exception 'This listing has offers, viewings or messages, so it cannot be deleted. Withdraw it instead.'
      using errcode = '42501';
  end if;

  return old;
end $fn$;

drop trigger if exists trg_listings_00_guard_delete on public.listings;
create trigger trg_listings_00_guard_delete
  before delete on public.listings
  for each row execute function public.listings_guard_delete();

-- Check: trg_listings_00_guard_delete must appear in this list.
select tgname as before_delete_triggers
from pg_trigger
where tgrelid = 'public.listings'::regclass
  and not tgisinternal
  and (tgtype & 2) <> 0
  and (tgtype & 8) <> 0
order by tgname;