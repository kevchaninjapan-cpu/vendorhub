-- ============================================================================
-- Listing guard
--
-- Before this, a seller could change ANY column on their own listing through
-- the public key: set it live without moderation, move to the elite pack for
-- free, edit published/expiry dates, or write moderation notes.
--
-- This trigger restricts direct changes by signed-in sellers. It is named
-- trg_listings_00_guard so it runs BEFORE listings_before_save (which sets
-- search_rank_boost and ready_to_buy) and log_listing_status_change (which
-- stamps published_at and expires_at). Postgres runs before-triggers in
-- alphabetical order.
--
-- Sellers CAN: create drafts, edit details/photos/price/disclosures, submit
-- a draft or rejected listing for review, withdraw (unless sold), set a
-- listing back to draft, and change pack tier while the listing is a draft,
-- rejected or withdrawn (the wizard re-saves those as drafts).
-- Sellers CANNOT: set live / under_offer / sold / rejected, change pack tier
-- once the listing is pending, live or under offer, touch published_at,
-- expires_at or moderation_notes, move a listing to another owner, or change
-- a sold listing.
--
-- Known gap until Stripe is in: a seller can set a live listing back to
-- draft, change the pack, and resubmit. Once payments set the tier, that
-- route closes.
--
-- UNDO:
--   drop trigger if exists trg_listings_00_guard on public.listings;
--   drop function if exists public.listings_guard();
-- ============================================================================

create or replace function public.listings_guard()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  -- Server code, owner-rights functions and the SQL Editor run as other roles.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  -- Moderators and admins can change anything.
  if is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'New listings must start as drafts.' using errcode = '42501';
    end if;
    if new.published_at is not null
       or new.expires_at is not null
       or new.moderation_notes is not null
       or new.rejected_reason is not null then
      raise exception 'That field can only be set by VendorHub staff.' using errcode = '42501';
    end if;
    return new;
  end if;

  -- UPDATE by a seller ------------------------------------------------------
  if new.member_id is distinct from old.member_id then
    raise exception 'A listing cannot be moved to another owner.' using errcode = '42501';
  end if;

  if new.published_at is distinct from old.published_at
     or new.expires_at is distinct from old.expires_at
     or new.moderation_notes is distinct from old.moderation_notes then
    raise exception 'That field can only be changed by VendorHub staff.' using errcode = '42501';
  end if;

  -- Sellers may clear a rejection reason (when resubmitting) but not write one.
  if new.rejected_reason is distinct from old.rejected_reason
     and new.rejected_reason is not null then
    raise exception 'That field can only be changed by VendorHub staff.' using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if old.status = 'sold' then
      raise exception 'A sold listing cannot be changed.' using errcode = '42501';
    end if;
    if new.status not in ('draft', 'pending_review', 'withdrawn') then
      raise exception 'Only VendorHub can set that status.' using errcode = '42501';
    end if;
    if new.status = 'pending_review' and old.status not in ('draft', 'rejected') then
      raise exception 'Only a draft or rejected listing can be submitted for review.' using errcode = '42501';
    end if;
  end if;

  if new.pack_tier is distinct from old.pack_tier
     and old.status not in ('draft', 'rejected', 'withdrawn') then
    raise exception 'The pack cannot be changed once a listing has been submitted.' using errcode = '42501';
  end if;

  return new;
end $fn$;

drop trigger if exists trg_listings_00_guard on public.listings;
create trigger trg_listings_00_guard
  before insert or update on public.listings
  for each row execute function public.listings_guard();

-- Check: trg_listings_00_guard must be FIRST in this list.
select tgname as before_save_triggers
from pg_trigger
where tgrelid = 'public.listings'::regclass
  and not tgisinternal
  and (tgtype & 2) <> 0
order by tgname;