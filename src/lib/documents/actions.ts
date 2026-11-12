"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { ZodError } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  documentUploadSchema,
  documentUpdateSchema,
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_BYTES,
  SINGLE_CURRENT_TYPES,
  type ActionResult,
  type DocumentUpload,
  type DocumentUpdate,
  type ListingDocument,
  type PublicListingDocument,
} from "./schema";

const BUCKET = "listing-disclosures";
const SIGNED_URL_TTL_SECONDS = 30 * 60; // 30 minutes

const ERRORS: Record<string, string> = {
  AUTH_REQUIRED: "Please sign in first.",
  DOCUMENT_NOT_FOUND: "That document no longer exists.",
  DOCUMENT_PRIVATE: "This document isn't available.",
  LISTING_NOT_AVAILABLE: "This listing isn't currently available.",
  VERIFICATION_REQUIRED: "Please complete identity verification to download this document.",
  NOT_LISTING_OWNER: "You can only manage documents on your own listings.",
  INVALID_PATH: "That upload couldn't be matched to this listing. Please try again.",
};

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            /* ignore in RSC */
          }
        },
      },
    }
  );
}

type SupabaseServer = Awaited<ReturnType<typeof getSupabase>>;

// No redirect() here: these actions are called from client components and a
// redirect thrown inside run() would be swallowed. The pages handle sign-in.
async function requireUser() {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("AUTH_REQUIRED");
  return { supabase, user };
}

function humanise(e: unknown): string {
  if (e instanceof ZodError) return "Some details are missing or invalid.";
  const msg = e instanceof Error ? e.message : "Something went wrong. Please try again.";
  return ERRORS[msg] ?? msg;
}

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    console.error("[documents]", e);
    return { ok: false, error: humanise(e) };
  }
}

function safeFileName(name: string): string {
  return name.replace(/[^a-z0-9.\-_]/gi, "_").slice(0, 200);
}

async function assertOwner(supabase: SupabaseServer, listingId: string, userId: string) {
  const { data, error } = await supabase
    .from("listings")
    .select("member_id")
    .eq("id", listingId)
    .maybeSingle<{ member_id: string }>();
  if (error) throw new Error(error.message);
  if (!data || data.member_id !== userId) throw new Error("NOT_LISTING_OWNER");
}

// ---- Upload step 1 --------------------------------------------------------
// Authorise, then mint a signed upload URL. The browser sends the file straight
// to storage, so the bytes never pass through a server action (whose body
// limit is far below the 25 MB a LIM can reach).
export async function createDocumentUploadUrl(
  listingId: string,
  fileName: string
): Promise<ActionResult<{ path: string; token: string }>> {
  return run(async () => {
    const { supabase, user } = await requireUser();
    await assertOwner(supabase, listingId, user.id);

    const path = `${user.id}/${listingId}/${Date.now()}-${safeFileName(fileName)}`;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) throw new Error(error.message);

    return { path, token: data.token };
  });
}

// ---- Upload step 2 --------------------------------------------------------
// Record the document once the file is in storage. For LIM and title, any
// previous document of the same type is removed (row and file).
export async function recordDocument(
  input: DocumentUpload & { file_path: string }
): Promise<ActionResult<{ id: string; replaced: number }>> {
  return run(async () => {
    const { supabase, user } = await requireUser();
    const admin = supabaseAdmin();
    const validated = documentUploadSchema.parse(input);
    const filePath = String(input.file_path ?? "");

    // Security: the path must sit inside this user's folder for this listing.
    // This check runs BEFORE any cleanup, because cleanup uses the admin
    // client and must never be pointed at someone else's file.
    const expectedPrefix = `${user.id}/${validated.listing_id}/`;
    if (!filePath.startsWith(expectedPrefix) || filePath.includes("..")) {
      throw new Error("INVALID_PATH");
    }

    const discard = async () => {
      await admin.storage.from(BUCKET).remove([filePath]);
    };

    if (!(ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(validated.mime_type)) {
      await discard();
      throw new Error("That file type isn't accepted. Use a PDF, JPG, PNG or Word document.");
    }

    if (validated.file_size > MAX_DOCUMENT_BYTES) {
      await discard();
      throw new Error("That file is too large. The limit is 25 MB.");
    }

    try {
      await assertOwner(supabase, validated.listing_id, user.id);
    } catch (e) {
      await discard();
      throw e;
    }

    const { data, error } = await supabase
      .from("listing_documents")
      .insert({
        listing_id: validated.listing_id,
        uploaded_by: user.id,
        doc_type: validated.doc_type,
        visibility: validated.visibility,
        file_path: filePath,
        file_name: validated.file_name,
        file_size: validated.file_size,
        mime_type: validated.mime_type,
        label: validated.label ?? null,
      })
      .select("id")
      .single<{ id: string }>();

    if (error) {
      await discard();
      throw new Error(error.message);
    }

    // One current LIM / title: remove older documents of the same type.
    // Done after the insert so a failed upload never leaves the listing with
    // no LIM at all.
    let replacedIds: string[] = [];
    if (SINGLE_CURRENT_TYPES.includes(validated.doc_type)) {
      const { data: older } = await supabase
        .from("listing_documents")
        .select("id, file_path")
        .eq("listing_id", validated.listing_id)
        .eq("doc_type", validated.doc_type)
        .neq("id", data.id);

      const old = (older ?? []) as { id: string; file_path: string }[];
      if (old.length > 0) {
        const { error: delErr } = await supabase
          .from("listing_documents")
          .delete()
          .in("id", old.map((o) => o.id));

        if (delErr) {
          console.error("[documents] could not remove superseded documents:", delErr);
        } else {
          replacedIds = old.map((o) => o.id);
          const { error: rmErr } = await admin.storage
            .from(BUCKET)
            .remove(old.map((o) => o.file_path));
          if (rmErr) console.error("[documents] orphaned storage objects:", rmErr);
        }
      }
    }

    await admin.from("audit_log").insert({
      actor_id: user.id,
      action: replacedIds.length > 0 ? "document_replaced" : "document_uploaded",
      target_type: "listing_document",
      target_id: data.id,
      metadata: {
        listing_id: validated.listing_id,
        doc_type: validated.doc_type,
        visibility: validated.visibility,
        replaced_ids: replacedIds,
      },
    });

    revalidatePath(`/account/listings/${validated.listing_id}/documents`);
    return { id: data.id, replaced: replacedIds.length };
  });
}

// ---- Read (server-side use) -----------------------------------------------

// Seller view: everything, including private documents.
export async function listDocumentsForOwner(listingId: string): Promise<ListingDocument[]> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("listing_documents")
    .select("*")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ListingDocument[];
}

// Buyer view: metadata only. Columns are listed explicitly so file_path can
// never leak to the client. Private documents are filtered out explicitly,
// because the owner policy would otherwise show them to a seller viewing
// their own public listing page.
export async function listDocumentsForBuyer(listingId: string): Promise<PublicListingDocument[]> {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from("listing_documents")
    .select(
      "id, listing_id, doc_type, visibility, file_name, file_size, mime_type, label, created_at, updated_at"
    )
    .eq("listing_id", listingId)
    .neq("visibility", "private")
    .order("doc_type");

  if (error) throw new Error(error.message);
  return (data ?? []) as PublicListingDocument[];
}

// Buyer download counts per document, for the seller. Counts distinct buyers
// only; the seller's own views are excluded.
export async function getDownloadCounts(listingId: string): Promise<Record<string, number>> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase.rpc("get_document_download_counts", {
    p_listing_id: listingId,
  });

  if (error) throw new Error(error.message);

  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as { document_id: string; buyer_downloads: number | string }[]) {
    counts[row.document_id] = Number(row.buyer_downloads);
  }
  return counts;
}

// ---- Download -------------------------------------------------------------
// Postgres decides entitlement and writes the audit row; this function only
// signs the path it is given back.
export async function requestDownload(
  documentId: string
): Promise<ActionResult<{ url: string; expiresInSeconds: number }>> {
  return run(async () => {
    const { supabase } = await requireUser();

    const { data: path, error } = await supabase.rpc("request_document_download", {
      p_document_id: documentId,
    });

    if (error) throw new Error(error.message);
    if (!path) throw new Error("DOCUMENT_NOT_FOUND");

    const { data: signed, error: signErr } = await supabaseAdmin()
      .storage.from(BUCKET)
      .createSignedUrl(path as string, SIGNED_URL_TTL_SECONDS);

    if (signErr) throw new Error(signErr.message);
    return { url: signed.signedUrl, expiresInSeconds: SIGNED_URL_TTL_SECONDS };
  });
}

// ---- Update / delete ------------------------------------------------------

export async function updateDocument(
  documentId: string,
  input: DocumentUpdate
): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const validated = documentUpdateSchema.parse(input);
    const { supabase, user } = await requireUser();

    const { data, error } = await supabase
      .from("listing_documents")
      .update(validated)
      .eq("id", documentId)
      .select("id, listing_id")
      .single<{ id: string; listing_id: string }>();

    if (error) throw new Error(error.message);

    await supabaseAdmin().from("audit_log").insert({
      actor_id: user.id,
      action: "document_updated",
      target_type: "listing_document",
      target_id: documentId,
      metadata: { ...validated },
    });

    revalidatePath(`/account/listings/${data.listing_id}/documents`);
    return { id: data.id };
  });
}

export async function deleteDocument(documentId: string): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const { supabase, user } = await requireUser();

    const { data: doc, error: readErr } = await supabase
      .from("listing_documents")
      .select("id, listing_id, file_path, doc_type")
      .eq("id", documentId)
      .maybeSingle<{ id: string; listing_id: string; file_path: string; doc_type: string }>();

    if (readErr) throw new Error(readErr.message);
    if (!doc) throw new Error("DOCUMENT_NOT_FOUND");

    const { error: delErr } = await supabase.from("listing_documents").delete().eq("id", documentId);
    if (delErr) throw new Error(delErr.message);

    // Row first, then bytes: an orphaned file is safer than a row pointing at nothing.
    const { error: storageErr } = await supabaseAdmin().storage.from(BUCKET).remove([doc.file_path]);
    if (storageErr) {
      console.error("[documents] orphaned storage object:", doc.file_path, storageErr);
    }

    await supabaseAdmin().from("audit_log").insert({
      actor_id: user.id,
      action: "document_deleted",
      target_type: "listing_document",
      target_id: documentId,
      metadata: { listing_id: doc.listing_id, doc_type: doc.doc_type, file_path: doc.file_path },
    });

    revalidatePath(`/account/listings/${doc.listing_id}/documents`);
    return { id: documentId };
  });
}