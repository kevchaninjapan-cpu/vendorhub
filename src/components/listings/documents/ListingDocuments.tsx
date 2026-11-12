import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { listDocumentsForBuyer } from "@/lib/documents/actions";
import {
  DOCUMENT_TYPE_LABELS,
  formatFileSize,
  type DocumentVisibility,
  type PublicListingDocument,
} from "@/lib/documents/schema";
import DocumentDownloadButton, { type DownloadAccess } from "./DocumentDownloadButton";

export default async function ListingDocuments({ listingId }: { listingId: string }) {
  let docs: PublicListingDocument[] = [];
  try {
    docs = await listDocumentsForBuyer(listingId);
  } catch {
    return null;
  }
  if (docs.length === 0) return null;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isOwner = false;
  let isVerified = false;

  if (user) {
    const [{ data: listing }, { data: verification }] = await Promise.all([
      supabase
        .from("listings")
        .select("member_id")
        .eq("id", listingId)
        .maybeSingle<{ member_id: string }>(),
      supabase
        .from("verifications")
        .select("status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ status: string }>(),
    ]);
    isOwner = listing?.member_id === user.id;
    isVerified = verification?.status === "approved";
  }

  const accessFor = (visibility: DocumentVisibility): DownloadAccess => {
    if (!user) return "signin";
    if (isOwner || visibility === "public" || isVerified) return "download";
    return "verify";
  };

  const needsVerification =
    Boolean(user) && !isOwner && !isVerified && docs.some((d) => d.visibility === "verified_buyers");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Property documents</h2>
      <p className="mt-1 text-sm text-slate-500">
        Documents the seller has provided for this property.
      </p>

      <ul className="mt-4 divide-y divide-slate-100">
        {docs.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">{DOCUMENT_TYPE_LABELS[d.doc_type]}</p>
              <p className="truncate text-xs text-slate-500">
                {d.label || d.file_name}
                {d.file_size ? ` - ${formatFileSize(d.file_size)}` : ""}
              </p>
            </div>
            <DocumentDownloadButton documentId={d.id} access={accessFor(d.visibility)} />
          </li>
        ))}
      </ul>

      {!user ? (
        <p className="mt-4 text-xs text-slate-500">
          Sign in to download. Most documents also need a verified account.
        </p>
      ) : null}

      {needsVerification ? (
        <p className="mt-4 text-xs text-slate-500">
          Verified buyers can download these documents. Verifying your ID takes a few minutes and
          also lets you make offers.
        </p>
      ) : null}

      {isOwner ? (
        <p className="mt-4 text-xs text-slate-500">
          This is your listing.{" "}
          <Link href={`/account/listings/${listingId}/documents`} className="underline">
            Manage documents
          </Link>
        </p>
      ) : null}
    </section>
  );
}