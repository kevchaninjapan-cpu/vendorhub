-- ============================================================================
-- Keep suburbs.active_listings_count current.
--
-- recount_active_listings() used to run only from the retired seed script,
-- so counts went stale as soon as a listing went live or was withdrawn.
-- This statement-level trigger recounts after any change that could move a
-- count. recount only writes rows whose count actually changed.
-- ============================================================================

create or replace function public.trg_recount_active_listings()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  perform public.recount_active_listings();
  return null;
end $function$;

drop trigger if exists trg_listings_recount on public.listings;
create trigger trg_listings_recount
  after insert or delete or update of status, suburb_id on public.listings
  for each statement execute function public.trg_recount_active_listings();

select public.recount_active_listings();