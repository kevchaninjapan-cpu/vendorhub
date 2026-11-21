-- Listing guard test. Safe to run: everything is rolled back at the end.
-- Run in the Supabase SQL Editor as postgres. You want: all guard tests passed

begin;

do $t$
declare
  v_id  uuid;
  v_uid uuid;
begin
  select id, member_id into v_id, v_uid from public.listings where status = 'live' limit 1;
  if v_id is null then raise exception 'No live listing to test with'; end if;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- 1. A seller must not change the pack on a live listing.
  begin
    update public.listings
    set pack_tier = case when pack_tier = 'elite' then 'starter'::pack_tier else 'elite'::pack_tier end
    where id = v_id;
    raise exception 'TEST FAILED: seller changed the pack on a live listing';
  exception when others then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
  end;

  -- 2. A seller must not mark their own listing sold.
  begin
    update public.listings set status = 'sold' where id = v_id;
    raise exception 'TEST FAILED: seller marked their own listing sold';
  exception when others then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
  end;

  -- 3. A normal edit must still work.
  update public.listings set description = description where id = v_id;
end $t$;

rollback;
select 'all guard tests passed' as result;