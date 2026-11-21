-- ============================================================================
-- Offers lock-down
--
-- Before: a buyer could insert an offer directly (policy offers_buyer_insert)
-- and either side could update ANY column (offers_participant_update).
-- That bypasses submit_offer's verification check and 75% price floor, lets a
-- buyer mark their own offer 'accepted', and lets a seller edit a buyer's
-- amount.
--
-- submit_offer, counter_offer, accept_offer and decline_offer all run with
-- the owner's rights, so they keep working. Nothing else in the app writes
-- offers. Reads are unchanged: buyers and sellers still see their own offers.
--
-- UNDO (restores direct writes):
--   grant insert, update on public.offers to authenticated;
--   create policy offers_buyer_insert on public.offers
--     for insert with check (auth.uid() = buyer_id);
--   create policy offers_participant_update on public.offers
--     for update
--     using ((auth.uid() = buyer_id) or exists (select 1 from listings l
--            where l.id = offers.listing_id and l.member_id = auth.uid()))
--     with check ((auth.uid() = buyer_id) or exists (select 1 from listings l
--            where l.id = offers.listing_id and l.member_id = auth.uid()));
-- ============================================================================

revoke all on table public.offers from anon;
revoke insert, update, delete on table public.offers from authenticated;

drop policy if exists offers_buyer_insert on public.offers;
drop policy if exists offers_participant_update on public.offers;

notify pgrst, 'reload schema';

-- Check: want insertable = false, updatable = false, readable = true.
select
  has_table_privilege('authenticated', 'public.offers', 'INSERT') as insertable,
  has_table_privilege('authenticated', 'public.offers', 'UPDATE') as updatable,
  has_table_privilege('authenticated', 'public.offers', 'SELECT') as readable;