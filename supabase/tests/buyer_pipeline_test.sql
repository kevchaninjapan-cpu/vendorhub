-- Test for the buyer pipeline.
-- Run in the Supabase SQL Editor as postgres, NEW tab, Ctrl+A, Ctrl+Enter.
-- EVERYTHING IS ROLLED BACK. A red "ALL TESTS PASSED (everything rolled back)" is a pass.

do $t$
declare
  l      uuid;
  s      uuid;
  b      uuid;
  v_task uuid;
  r      jsonb;
  n      integer;
begin
  select id, member_id into l, s from public.listings where status in ('live', 'under_offer') order by id limit 1;
  if l is null then raise exception 'SETUP FAILED: no live listing'; end if;
  select id into b from public.profiles where id <> s order by id limit 1;
  if b is null then raise exception 'SETUP FAILED: need a second profile'; end if;

  update public.profiles set role = 'member' where id in (s, b);
  update public.listings set pack_tier = 'starter' where id = l;
  delete from public.offers where listing_id = l;
  delete from public.viewings where listing_id = l and buyer_id = b;
  delete from public.viewing_requests where listing_id = l and buyer_id = b;
  delete from public.listing_conversations where listing_id = l and buyer_id = b;
  delete from public.crm_tasks where listing_id = l;
  delete from public.crm_lead_meta where listing_id = l;

  insert into public.offers (listing_id, buyer_id, amount, status, proposed_by)
  values (l, b, 900000, 'submitted', 'buyer');

  -- 1. The seller sees the buyer as a lead at "Offer made".
  perform set_config('request.jwt.claims', json_build_object('sub', s, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.seller_pipeline();
  if not exists (select 1 from jsonb_array_elements(r->'leads') e
                 where e->>'listing_id' = l::text and e->>'buyer_id' = b::text and e->>'auto_stage' = 'offer_made') then
    raise exception 'TEST FAILED: lead missing or not at offer_made';
  end if;

  -- 2. Starter: notes work; manual stages and tasks don't.
  perform public.crm_update_lead(l, b, null, false, 'hot', 'Keen, pre-approved');
  begin
    perform public.crm_add_task(l, b, 'Call back', (now() at time zone 'Pacific/Auckland')::date);
    raise exception 'TEST FAILED: Starter listing could add a task';
  exception when others then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
    if sqlerrm not like '%PRO_FEATURE%' then raise exception 'TEST FAILED: expected PRO_FEATURE, got %', sqlerrm; end if;
  end;
  begin
    perform public.crm_update_lead(l, b, 'negotiating', false, null, null);
    raise exception 'TEST FAILED: Starter listing could set a stage';
  exception when others then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
    if sqlerrm not like '%PRO_FEATURE%' then raise exception 'TEST FAILED: expected PRO_FEATURE, got %', sqlerrm; end if;
  end;

  -- 3. Pro: manual stage and a task due today show up.
  reset role;
  update public.listings set pack_tier = 'pro' where id = l;
  set local role authenticated;
  perform public.crm_update_lead(l, b, 'negotiating', false, null, null);
  v_task := public.crm_add_task(l, b, 'Call back', (now() at time zone 'Pacific/Auckland')::date);
  r := public.seller_pipeline();
  if not exists (select 1 from jsonb_array_elements(r->'leads') e
                 where e->>'buyer_id' = b::text and e->>'listing_id' = l::text
                   and e->>'stage' = 'negotiating' and (e->>'stage_is_manual')::boolean
                   and e->>'notes' = 'Keen, pre-approved' and e->>'temperature' = 'hot') then
    raise exception 'TEST FAILED: manual stage, notes or label not saved';
  end if;
  if jsonb_array_length(r->'due') < 1 then raise exception 'TEST FAILED: task due today not listed'; end if;

  -- 4. Direct table access is blocked.
  begin
    select count(*) into n from public.crm_tasks;
    raise exception 'TEST FAILED: crm_tasks readable directly';
  exception when insufficient_privilege then
    null;
  end;

  -- 5. Someone else can't edit the lead.
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.crm_update_lead(l, b, null, false, 'cold', 'x');
    raise exception 'TEST FAILED: a non-owner edited the lead';
  exception when others then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
    if sqlerrm not like '%NOT_LISTING_OWNER%' then raise exception 'TEST FAILED: expected NOT_LISTING_OWNER, got %', sqlerrm; end if;
  end;

  -- 6. The reminder job sees the task.
  reset role;
  if not exists (select 1 from public.crm_due_reminders() d where d.task_id = v_task) then
    raise exception 'TEST FAILED: reminder job does not see the due task';
  end if;

  raise exception 'ALL TESTS PASSED (everything rolled back)';
end $t$;