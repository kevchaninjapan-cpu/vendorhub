-- ============================================================================
-- Messaging inbox
--
-- * Enquiries post into listing_conversations (one thread per buyer per
--   listing), replacing the separate enquiries / enquiry_replies tables.
-- * Inbox list and unread count for the signed-in user.
-- * Email throttling: at most one "new message" email per person per
--   conversation every 15 minutes, unless they've read it since.
-- * Anti-cloning: anon has no access to request/message tables, and users
--   can only write them through the functions below.
-- ============================================================================

alter table public.listing_conversations
  add column if not exists buyer_notified_at  timestamptz,
  add column if not exists seller_notified_at timestamptz;

-- ---- Lock the tables down ---------------------------------------------------
revoke all on table public.listing_conversations from anon;
revoke all on table public.listing_messages      from anon;
revoke all on table public.viewing_requests      from anon;
revoke insert, update, delete on table public.listing_conversations from authenticated;
revoke insert, update, delete on table public.listing_messages      from authenticated;
revoke insert, update, delete on table public.viewing_requests      from authenticated;

-- ---- Buyer: send an enquiry -------------------------------------------------
create or replace function public.start_listing_enquiry(p_listing_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_actor uuid := auth.uid();
  v_body  text := trim(coalesce(p_body, ''));
  l       record;
  v_conv  uuid;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(v_body) < 2 then raise exception 'MESSAGE_EMPTY'; end if;
  if length(v_body) > 2000 then raise exception 'MESSAGE_TOO_LONG'; end if;

  select id, member_id, status into l from listings where id = p_listing_id;
  if not found then raise exception 'LISTING_NOT_FOUND'; end if;
  if l.member_id = v_actor then raise exception 'OWN_LISTING'; end if;
  if l.status not in ('live', 'under_offer') then raise exception 'LISTING_NOT_AVAILABLE'; end if;

  v_conv := _vh_ensure_conversation(p_listing_id, v_actor);

  insert into listing_messages (conversation_id, sender_id, kind, body)
  values (v_conv, v_actor, 'text', v_body);

  update listing_conversations
  set last_message_at = now(), buyer_last_read_at = now()
  where id = v_conv;

  insert into audit_log (actor_id, action, target_type, target_id, metadata)
  values (v_actor, 'enquiry_sent', 'conversation', v_conv,
          jsonb_build_object('listing_id', p_listing_id));

  return v_conv;
end $function$;

revoke execute on function public.start_listing_enquiry(uuid, text) from public, anon;
grant  execute on function public.start_listing_enquiry(uuid, text) to authenticated;

-- ---- Inbox list -------------------------------------------------------------
create or replace function public.list_my_conversations()
returns table (
  id              uuid,
  listing_id      uuid,
  role            text,
  other_name      text,
  listing_title   text,
  listing_status  text,
  listing_slug    text,
  listing_region  text,
  listing_suburb  text,
  last_body       text,
  last_kind       text,
  last_message_at timestamptz,
  unread          integer
)
language sql
stable
security definer
set search_path = public
as $function$
  select
    c.id,
    c.listing_id,
    case when c.seller_id = auth.uid() then 'seller' else 'buyer' end,
    case
      when c.seller_id = auth.uid() then coalesce(
        (select vr.buyer_name from viewing_requests vr
          where vr.listing_id = c.listing_id and vr.buyer_id = c.buyer_id
          order by vr.created_at desc limit 1),
        nullif(trim(p.full_name), ''),
        'Buyer')
      else 'Seller'
    end,
    coalesce(l.headline, l.formatted_address, 'Listing'),
    l.status::text,
    l.slug,
    l.region,
    l.suburb,
    lm.body,
    lm.kind,
    c.last_message_at,
    (select count(*)::integer
       from listing_messages m
      where m.conversation_id = c.id
        and m.kind = 'text'
        and m.sender_id is not null
        and m.sender_id <> auth.uid()
        and m.created_at > coalesce(
              case when c.seller_id = auth.uid() then c.seller_last_read_at else c.buyer_last_read_at end,
              '-infinity'::timestamptz))
  from listing_conversations c
  join listings l on l.id = c.listing_id
  left join profiles p on p.id = c.buyer_id
  left join lateral (
    select m.body, m.kind from listing_messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) lm on true
  where auth.uid() is not null
    and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  order by c.last_message_at desc
  limit 200;
$function$;

revoke execute on function public.list_my_conversations() from public, anon;
grant  execute on function public.list_my_conversations() to authenticated;

create or replace function public.get_unread_message_count()
returns integer
language sql
stable
security definer
set search_path = public
as $function$
  select coalesce(sum(unread), 0)::integer from list_my_conversations();
$function$;

revoke execute on function public.get_unread_message_count() from public, anon;
grant  execute on function public.get_unread_message_count() to authenticated;

-- ---- Email throttle (server only) -------------------------------------------
-- Returns true if an email may be sent now, and records that it was.
create or replace function public.claim_message_notification(p_conversation_id uuid, p_to_buyer boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_n integer;
begin
  if p_to_buyer then
    update listing_conversations
    set buyer_notified_at = now()
    where id = p_conversation_id
      and (buyer_notified_at is null
           or buyer_notified_at < now() - interval '15 minutes'
           or buyer_notified_at < coalesce(buyer_last_read_at, '-infinity'::timestamptz));
  else
    update listing_conversations
    set seller_notified_at = now()
    where id = p_conversation_id
      and (seller_notified_at is null
           or seller_notified_at < now() - interval '15 minutes'
           or seller_notified_at < coalesce(seller_last_read_at, '-infinity'::timestamptz));
  end if;
  get diagnostics v_n = row_count;
  return v_n > 0;
end $function$;

revoke execute on function public.claim_message_notification(uuid, boolean) from public, anon, authenticated;
grant  execute on function public.claim_message_notification(uuid, boolean) to service_role;

notify pgrst, 'reload schema';