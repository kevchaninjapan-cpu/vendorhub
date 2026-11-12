-- ============================================================================
-- Listing documents (Phase 1 spec item)
--
-- Documents are first-class rows. listings.disclosures stays as boolean
-- attestations; this table holds the evidence behind them.
--
-- Access: metadata is visible to anyone who can see the listing; file bytes
-- need an approved verification (or sign-in only for 'public' documents).
-- Downloads use short-lived signed URLs minted server-side.
-- No pack_tier gating.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'document_type') then
    create type document_type as enum (
      'lim', 'title', 'building_report', 'sale_purchase_agreement', 'floor_plan', 'other'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'document_visibility') then
    create type document_visibility as enum ('private', 'verified_buyers', 'public');
  end if;
end $$;

create table if not exists public.listing_documents (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings (id) on delete cascade,
  uploaded_by  uuid references auth.users (id) on delete set null,
  doc_type     document_type not null,
  visibility   document_visibility not null default 'verified_buyers',
  -- Path in 'listing-disclosures', keyed "<user_id>/<listing_id>/<file>"
  file_path    text not null unique,
  file_name    text not null,
  file_size    bigint,
  mime_type    text,
  label        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_listing_documents_listing  on public.listing_documents (listing_id);
create index if not exists idx_listing_documents_uploader on public.listing_documents (uploaded_by);
create index if not exists idx_listing_documents_visible
  on public.listing_documents (listing_id, doc_type)
  where visibility <> 'private';

drop trigger if exists trg_listing_documents_updated_at on public.listing_documents;
create trigger trg_listing_documents_updated_at
  before update on public.listing_documents
  for each row execute function public.touch_updated_at();

alter table public.listing_documents enable row level security;

-- Seller: full control on their own listings. WITH CHECK also pins file_path
-- to the seller's own folder, so a seller cannot record someone else's file
-- and have it signed for them at download time.
drop policy if exists listing_documents_owner_all on public.listing_documents;
create policy listing_documents_owner_all on public.listing_documents
  for all
  using (
    exists (select 1 from listings l
            where l.id = listing_documents.listing_id
              and l.member_id = auth.uid())
  )
  with check (
    exists (select 1 from listings l
            where l.id = listing_documents.listing_id
              and l.member_id = auth.uid())
    and file_path like auth.uid()::text || '/' || listing_id::text || '/%'
  );

-- Anyone who can see the listing can see that non-private documents exist.
drop policy if exists listing_documents_public_read on public.listing_documents;
create policy listing_documents_public_read on public.listing_documents
  for select
  using (
    visibility <> 'private'
    and exists (select 1 from listings l
                where l.id = listing_documents.listing_id
                  and l.status in ('live', 'under_offer'))
  );

drop policy if exists listing_documents_admin_read on public.listing_documents;
create policy listing_documents_admin_read on public.listing_documents
  for select
  using (is_admin());

-- Returns the storage path only if the caller may download the file, and
-- writes the audit row. The server action then signs that path.
create or replace function public.request_document_download(p_document_id uuid)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_doc record;
  v_verification_status verification_status;
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;

  select d.*, l.member_id as seller_id, l.status as listing_status
    into v_doc
  from listing_documents d
  join listings l on l.id = d.listing_id
  where d.id = p_document_id;

  if not found then raise exception 'DOCUMENT_NOT_FOUND'; end if;

  if v_doc.seller_id = v_actor or is_admin() then
    insert into audit_log (actor_id, action, target_type, target_id, metadata)
    values (v_actor, 'document_downloaded', 'listing_document', p_document_id,
      jsonb_build_object('listing_id', v_doc.listing_id, 'doc_type', v_doc.doc_type,
        'as', case when v_doc.seller_id = v_actor then 'seller' else 'admin' end));
    return v_doc.file_path;
  end if;

  if v_doc.visibility = 'private' then raise exception 'DOCUMENT_PRIVATE'; end if;

  if v_doc.listing_status not in ('live', 'under_offer') then
    raise exception 'LISTING_NOT_AVAILABLE';
  end if;

  if v_doc.visibility = 'verified_buyers' then
    select status into v_verification_status
    from verifications
    where user_id = v_actor
    order by created_at desc
    limit 1;

    if v_verification_status is null or v_verification_status <> 'approved' then
      raise exception 'VERIFICATION_REQUIRED';
    end if;
  end if;

  insert into audit_log (actor_id, action, target_type, target_id, metadata)
  values (v_actor, 'document_downloaded', 'listing_document', p_document_id,
    jsonb_build_object('listing_id', v_doc.listing_id, 'doc_type', v_doc.doc_type, 'as', 'buyer'));

  return v_doc.file_path;
end $function$;

grant execute on function public.request_document_download(uuid) to authenticated;

-- Bucket already exists, private, with an owner policy on the first path
-- segment. Inserted here only so a fresh database gets it.
insert into storage.buckets (id, name, public)
values ('listing-disclosures', 'listing-disclosures', false)
on conflict (id) do nothing;

-- Enforce size and type at the bucket. Uploads go browser-to-storage, so the
-- checks in recordDocument only run after the bytes are already stored.
update storage.buckets
set file_size_limit = 26214400,
    allowed_mime_types = array[
      'application/pdf', 'image/jpeg', 'image/png', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
where id = 'listing-disclosures';

notify pgrst, 'reload schema';