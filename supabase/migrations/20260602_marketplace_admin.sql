-- Admin role, is_admin() and admin access rules.
-- Generated from the live database on 13 Oct 2026.
-- Runs after marketplace_init and marketplace_storage (tables must exist first).
-- listing_documents_admin_read lives in 20260915_listing_documents.sql.

alter table public.profiles add column if not exists role text not null default 'user';

create or replace function public.is_admin()
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and role in ('moderator','admin')
  );
$function$;

drop policy if exists listing_media_admin_read on public.listing_media;
create policy listing_media_admin_read on public.listing_media as permissive for select to public
  using (is_admin());

drop policy if exists listings_admin_read on public.listings;
create policy listings_admin_read on public.listings as permissive for select to public
  using (is_admin());

drop policy if exists listings_admin_update on public.listings;
create policy listings_admin_update on public.listings as permissive for update to public
  using (is_admin())
  with check (is_admin());

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles as permissive for update to public
  using (is_admin())
  with check (is_admin());

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles as permissive for select to public
  using ((auth.uid() = id) or is_admin());

drop policy if exists reports_admin_read on public.reports;
create policy reports_admin_read on public.reports as permissive for select to public
  using (is_admin());

drop policy if exists reports_admin_update on public.reports;
create policy reports_admin_update on public.reports as permissive for update to public
  using (is_admin())
  with check (is_admin());

drop policy if exists verifications_admin_read on public.verifications;
create policy verifications_admin_read on public.verifications as permissive for select to public
  using (is_admin());

drop policy if exists verifications_admin_update on public.verifications;
create policy verifications_admin_update on public.verifications as permissive for update to public
  using (is_admin())
  with check (is_admin());

drop policy if exists verifications_admin_read on storage.objects;
create policy verifications_admin_read on storage.objects as permissive for select to public
  using ((bucket_id = 'verifications') and is_admin());

notify pgrst, 'reload schema';