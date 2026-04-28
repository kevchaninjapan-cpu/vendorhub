// app/listings/[id]/page.tsx
import { notFound } from "next/navigation";
import supabaseServer from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
};

function fmtDate(v: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleDateString();
  } catch {
    return v;
  }
}

export default async function ListingPage({ params }: PageProps) {
  const supabase = await supabaseServer();

  const { data: listing, error } = await supabase
    .from("listings")
    .select(
      `
      id,
      title,
      description,
      address_line1,
      address_line2,
      city,
      bedrooms,
      bathrooms,
      car_spaces,
      year_built,
      created_at,
      updated_at,
      status
    `
    )
    .eq("id", params.id)
    .single();

  if (error || !listing) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {listing.title}
        </h1>

        <div className="text-sm text-slate-900">
          {[listing.address_line1, listing.address_line2, listing.city]
            .filter(Boolean)
            .join(", ")}
        </div>
      </div>

      {/* Key facts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 rounded-lg border bg-white p-6">
        <div>
          <div className="text-xs text-gray-500">Bedrooms</div>
          <div className="font-medium">{listing.bedrooms}</div>
        </div>

        <div>
          <div className="text-xs text-gray-500">Bathrooms</div>
          <div className="font-medium">{listing.bathrooms}</div>
        </div>

        {listing.car_spaces !== null && (
          <div>
            <div className="text-xs text-gray-500">Carparks</div>
            <div className="font-medium">{listing.car_spaces}</div>
          </div>
        )}

        {listing.year_built && (
          <div>
            <div className="text-xs text-gray-500">Year built</div>
            <div className="font-medium">{listing.year_built}</div>
          </div>
        )}
      </div>

      {/* Description */}
      {listing.description && (
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Description</h2>
          <p className="text-slate-700 leading-relaxed whitespace-pre-line">
            {listing.description}
          </p>
        </div>
      )}

      {/* Metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-slate-900">
        <div>
          <div className="text-xs text-gray-500">Listed</div>
          <div className="font-medium">{fmtDate(listing.created_at)}</div>
        </div>

        {listing.updated_at && (
          <div>
            <div className="text-xs text-gray-500">Last updated</div>
            <div className="font-medium">
              {fmtDate(listing.updated_at)}
            </div>
          </div>
        )}
      </div>

      {/* Status (non-fatal, display only) */}
      {listing.status === "withdrawn" && (
        <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          This listing has been withdrawn from the market.
        </div>
      )}
    </div>
  );
}