-- ============================================================================
-- Listing guard - valuation figures
--
-- valuation_estimate / _low / _high / _confidence show publicly on a listing.
-- Sellers should not be able to write them. RUN THIS ONLY AFTER confirming
-- nothing in the wizard or seller actions writes these columns (the PowerShell
-- check from Copilot). If the wizard does write them, this will block saves.
--
-- UNDO:
--   drop trigger if exists trg_listings_01_guard_valuation on public.listings;
--   drop function if exists public.listings_guard_valuation();
-- ============================================================================

create or replace function public.listings_guard_valuation()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.valuation_estimate is not null
       or new.valuation_low is not null
       or new.valuation_high is not null
       or new.valuation_confidence is not null then
      raise exception 'Valuation figures can only be set by VendorHub.' using errcode = '42501';
    end if;
  else
    if new.valuation_estimate is distinct from old.valuation_estimate
       or new.valuation_low is distinct from old.valuation_low
       or new.valuation_high is distinct from old.valuation_high
       or new.valuation_confidence is distinct from old.valuation_confidence then
      raise exception 'Valuation figures can only be changed by VendorHub.' using errcode = '42501';
    end if;
  end if;

  return new;
end $fn$;

drop trigger if exists trg_listings_01_guard_valuation on public.listings;
create trigger trg_listings_01_guard_valuation
  before insert or update on public.listings
  for each row execute function public.listings_guard_valuation();

select tgname as before_save_triggers
from pg_trigger
where tgrelid = 'public.listings'::regclass
  and not tgisinternal
  and (tgtype & 2) <> 0
order by tgname;