-- ============================================================================
-- Negotiation workspace + offer turn rules. Safe to run more than once.
--
-- Rules after this:
--   * Each offer records who proposed it (buyer or seller).
--   * Only the OTHER party can accept or counter the latest offer.
--   * Only the latest offer in a negotiation (status 'submitted') can be
--     accepted, countered, declined or withdrawn. Superseded offers can't.
--   * Expired offers can't be accepted or countered; they're marked
--     'expired' when either party opens their offers page.
--   * Declining your own latest offer = withdrawn; declining the other
--     party's = declined.
--   * A buyer's counter must meet the same 75% minimum as a first offer.
--   * When no active or accepted offers remain, an 'under_offer' listing
--     goes back to 'live'.
-- ============================================================================

alter table public.offers add column if not exists proposed_by text not null default 'buyer';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'offers_proposed_by_check') then
    alter table public.offers add constraint offers_proposed_by_check check (proposed_by in ('buyer', 'seller'));
  end if;
end $$;

-- Backfill: counters made by the seller (from the audit log).
update public.offers o
set proposed_by = 'seller'
from public.audit_log a, public.listings l
where a.action = 'offer_countered'
  and a.target_id = o.id
  and l.id = o.listing_id
  and a.actor_id = l.member_id
  and o.counter_of is not null
  and o.proposed_by <> 'seller';

-- ---- Internal: put a listing back to live when no offers remain -------------
create or replace function public._vh_refresh_listing_offer_status(p_listing_id uuid)
returns void
language sql
security definer
set search_path = public
as $fn$
  update listings set status = 'live'
  where id = p_listing_id
    and status = 'under_offer'
    and not exists (select 1 from offers
                    where listing_id = p_listing_id and status::text in ('submitted', 'accepted'));
$fn$;
revoke execute on function public._vh_refresh_listing_offer_status(uuid) from public, anon, authenticated;

-- ---- Counter ----------------------------------------------------------------
create or replace function public.counter_offer(p_offer_id uuid, p_amount numeric, p_notes text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_o     record;
  v_role  text;
  v_min   numeric;
  v_new   uuid;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;

  select o.*, l.member_id as seller_id, l.status::text as listing_status,
         l.method_of_sale::text as sale_method, l.asking_price, l.beo_amount
    into v_o
  from offers o join listings l on l.id = o.listing_id
  where o.id = p_offer_id
  for update of o;

  if not found then raise exception 'OFFER_NOT_FOUND'; end if;
  if v_o.seller_id = v_actor then v_role := 'seller';
  elsif v_o.buyer_id = v_actor then v_role := 'buyer';
  else raise exception 'NOT_PARTICIPANT'; end if;

  if v_o.status::text <> 'submitted' then raise exception 'OFFER_NOT_ACTIVE'; end if;
  if v_o.expires_at is not null and v_o.expires_at <= now() then raise exception 'OFFER_EXPIRED'; end if;
  if v_o.proposed_by = v_role then raise exception 'NOT_YOUR_TURN'; end if;
  if v_o.listing_status not in ('live', 'under_offer') then raise exception 'LISTING_NOT_ACCEPTING_OFFERS'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'AMOUNT_INVALID'; end if;

  if v_role = 'buyer' then
    if v_o.sale_method = 'asking_price' and v_o.asking_price is not null then v_min := v_o.asking_price * 0.75;
    elsif v_o.sale_method = 'beo' and v_o.beo_amount is not null then v_min := v_o.beo_amount * 0.75;
    end if;
    if v_min is not null and p_amount < v_min then raise exception 'OFFER_BELOW_MIN_PRICE:%', v_min; end if;
  end if;

  update offers set status = 'countered' where id = p_offer_id;

  insert into offers (
    listing_id, buyer_id, amount, conditions, expires_at, settlement_date, notes,
    status, counter_of, proposed_by, finance_condition, building_report_condition, lim_condition
  ) values (
    v_o.listing_id, v_o.buyer_id, p_amount, v_o.conditions, v_o.expires_at, v_o.settlement_date,
    nullif(trim(coalesce(p_notes, '')), ''),
    'submitted', p_offer_id, v_role, v_o.finance_condition, v_o.building_report_condition, v_o.lim_condition
  ) returning id into v_new;

  insert into audit_log (actor_id, action, target_type, target_id, metadata)
  values (v_actor, 'offer_countered', 'offer', v_new,
          jsonb_build_object('original_offer_id', p_offer_id, 'amount', p_amount, 'by', v_role));

  return v_new;
end $function$;

-- ---- Accept -----------------------------------------------------------------
create or replace function public.accept_offer(p_offer_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_o     record;
  v_role  text;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;

  select o.*, l.member_id as seller_id, l.status::text as listing_status
    into v_o
  from offers o join listings l on l.id = o.listing_id
  where o.id = p_offer_id
  for update of o;

  if not found then raise exception 'OFFER_NOT_FOUND'; end if;
  if v_o.seller_id = v_actor then v_role := 'seller';
  elsif v_o.buyer_id = v_actor then v_role := 'buyer';
  else raise exception 'NOT_PARTICIPANT'; end if;

  if v_o.status::text <> 'submitted' then raise exception 'OFFER_NOT_ACTIVE'; end if;
  if v_o.expires_at is not null and v_o.expires_at <= now() then raise exception 'OFFER_EXPIRED'; end if;
  if v_o.proposed_by = v_role then raise exception 'NOT_YOUR_TURN'; end if;
  if v_o.listing_status not in ('live', 'under_offer') then raise exception 'LISTING_NOT_ACCEPTING_OFFERS'; end if;

  update offers set status = 'accepted' where id = p_offer_id;

  -- Decline the latest offer in every other negotiation on this listing.
  -- Superseded ('countered') offers keep their label as history.
  update offers set status = 'declined'
  where listing_id = v_o.listing_id and id <> p_offer_id and status::text = 'submitted';

  insert into audit_log (actor_id, action, target_type, target_id, metadata)
  values (v_actor, 'offer_accepted', 'offer', p_offer_id,
          jsonb_build_object('listing_id', v_o.listing_id, 'by', v_role));
end $function$;

-- ---- Decline / withdraw -----------------------------------------------------
create or replace function public.decline_offer(p_offer_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor  uuid := auth.uid();
  v_o      record;
  v_role   text;
  v_status text;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;

  select o.*, l.member_id as seller_id
    into v_o
  from offers o join listings l on l.id = o.listing_id
  where o.id = p_offer_id
  for update of o;

  if not found then raise exception 'OFFER_NOT_FOUND'; end if;
  if v_o.seller_id = v_actor then v_role := 'seller';
  elsif v_o.buyer_id = v_actor then v_role := 'buyer';
  else raise exception 'NOT_PARTICIPANT'; end if;

  if v_o.status::text <> 'submitted' then raise exception 'OFFER_NOT_ACTIVE'; end if;

  v_status := case when v_o.proposed_by = v_role then 'withdrawn' else 'declined' end;
  update offers set status = v_status::offer_status where id = p_offer_id;

  perform _vh_refresh_listing_offer_status(v_o.listing_id);

  insert into audit_log (actor_id, action, target_type, target_id, metadata)
  values (v_actor, case when v_status = 'withdrawn' then 'offer_withdrawn' else 'offer_declined' end,
          'offer', p_offer_id, jsonb_build_object('reason', p_reason, 'by', v_role));
end $function$;

grant execute on function public.counter_offer(uuid, numeric, text) to authenticated;
grant execute on function public.accept_offer(uuid) to authenticated;
grant execute on function public.decline_offer(uuid, text) to authenticated;
revoke execute on function public.counter_offer(uuid, numeric, text) from public, anon;
revoke execute on function public.accept_offer(uuid) from public, anon;
revoke execute on function public.decline_offer(uuid, text) from public, anon;

-- ---- Workspace data ---------------------------------------------------------
create or replace function public.my_negotiations()
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := auth.uid();
  v_out jsonb;
  r     record;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  -- Expire this user's stale offers.
  for r in
    update offers o set status = 'expired'
    from listings l
    where l.id = o.listing_id
      and o.status::text = 'submitted'
      and o.expires_at is not null and o.expires_at <= now()
      and (o.buyer_id = v_uid or l.member_id = v_uid)
    returning o.listing_id
  loop
    perform _vh_refresh_listing_offer_status(r.listing_id);
  end loop;

  with mine as (
    select o.id, o.listing_id, o.buyer_id, o.amount, o.proposed_by, o.status::text as status,
           coalesce(o.conditions, '{}'::text[]) as conditions, o.settlement_date, o.expires_at,
           o.notes, o.created_at,
           l.member_id as seller_id, l.headline, l.formatted_address, l.suburb, l.region, l.slug,
           coalesce(l.display_address_masked, false) as masked, l.status::text as listing_status,
           case when l.member_id = v_uid then 'seller' else 'buyer' end as my_role
    from offers o join listings l on l.id = o.listing_id
    where o.buyer_id = v_uid or l.member_id = v_uid
  ),
  threads as (
    select listing_id, buyer_id, max(created_at) as last_at
    from mine group by listing_id, buyer_id
  ),
  built as (
    select th.last_at,
           (lat.status = 'submitted' and lat.proposed_by <> lat.my_role) as my_turn,
           jsonb_build_object(
             'key', th.listing_id::text || ':' || th.buyer_id::text,
             'listing_id', th.listing_id,
             'role', lat.my_role,
             'listing_title', case when lat.my_role = 'buyer' and lat.masked
                                   then coalesce(nullif(concat_ws(', ', lat.suburb, lat.region), ''), 'A listing')
                                   else coalesce(lat.headline, lat.formatted_address, 'Listing') end,
             'listing_slug', lat.slug,
             'listing_region', lat.region,
             'listing_suburb', lat.suburb,
             'listing_status', lat.listing_status,
             'other_name', case when lat.my_role = 'seller' then coalesce(
                               (select vr.buyer_name from viewing_requests vr
                                where vr.listing_id = th.listing_id and vr.buyer_id = th.buyer_id
                                order by vr.created_at desc limit 1),
                               (select nullif(trim(p.full_name), '') from profiles p where p.id = th.buyer_id),
                               'Buyer')
                             else 'Seller' end,
             'conversation_id', (select c.id from listing_conversations c
                                 where c.listing_id = th.listing_id and c.buyer_id = th.buyer_id),
             'my_turn', (lat.status = 'submitted' and lat.proposed_by <> lat.my_role),
             'offers', (select jsonb_agg(jsonb_build_object(
                           'id', m.id, 'amount', m.amount, 'proposed_by', m.proposed_by, 'status', m.status,
                           'conditions', to_jsonb(m.conditions), 'settlement_date', m.settlement_date,
                           'expires_at', m.expires_at, 'notes', m.notes, 'created_at', m.created_at)
                         order by m.created_at, (m.status = 'submitted'), m.id)
                        from mine m where m.listing_id = th.listing_id and m.buyer_id = th.buyer_id)
           ) as obj
    from threads th
    join lateral (
      select * from mine m where m.listing_id = th.listing_id and m.buyer_id = th.buyer_id
      order by (m.status = 'submitted') desc, m.created_at desc, m.id desc limit 1
    ) lat on true
  )
  select coalesce(jsonb_agg(obj order by my_turn desc, last_at desc), '[]'::jsonb) into v_out from built;

  return v_out;
end $fn$;

revoke execute on function public.my_negotiations() from public, anon;
grant  execute on function public.my_negotiations() to authenticated;

notify pgrst, 'reload schema';

-- Check: column exists; how many offers each side proposed.
select proposed_by, count(*) as offers from public.offers group by proposed_by order by proposed_by;