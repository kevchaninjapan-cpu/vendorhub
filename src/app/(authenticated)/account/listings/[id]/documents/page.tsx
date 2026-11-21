import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { listDocumentsForOwner, getDownloadCounts } from "@/lib/documents/actions";
import DocumentsManager, {
  type OwnerDocumentRow,
} from "@/components/listings/documents/DocumentsManager";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ListingDocumentsPage({ params }: Props) {
  const { id } = await params;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/signin?redirect=${encodeURIComponent(`/account/listings/${id}/documents`)}`);
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, member_id, headline, formatted_address, status")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      member_id: string;
      headline: string | null;
      formatted_address: string | null;
      status: string;
    }>();

  if (!listing || listing.member_id !== user.id) notFound();

  const docs = await listDocumentsForOwner(id);

  // Counts are a nice-to-have; never let them break the page.
  let counts: Record<string, number> = {};
  try {
    counts = await getDownloadCounts(id);
  } catch {
    counts = {};
  }

  // Map field by field so file_path is never sent to the browser.
  const rows: OwnerDocumentRow[] = docs.map((d) => ({
    id: d.id,
    listing_id: d.listing_id,
    doc_type: d.doc_type,
    visibility: d.visibility,
    file_name: d.file_name,
    file_size: d.file_size,
    mime_type: d.mime_type,
    label: d.label,
    created_at: d.created_at,
    updated_at: d.updated_at,
    downloads: counts[d.id] ?? 0,
  }));

  const title = listing.headline ?? listing.formatted_address ?? "Your listing";
  const isVisible = listing.status === "live" || listing.status === "under_offer";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/account/listings" className="text-sm text-slate-500 hover:text-slate-800">
        &larr; Back to my listings
      </Link>

      <h1 className="mt-3 text-2xl font-semibold text-slate-900">Documents</h1>
      <p className="mt-1 text-sm text-slate-500">{title}</p>

      {!isVisible ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Buyers will see these documents once your listing is live.
        </p>
      ) : null}

      <div className="mt-6">
        <DocumentsManager listingId={listing.id} documents={rows} />
      </div>
    </div>
  );
}