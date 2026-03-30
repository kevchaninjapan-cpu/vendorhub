import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function fmtDate(v: any) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

function pillClass(status?: string) {
  const s = String(status ?? "").toLowerCase();
  if (s === "active")
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (s === "draft")
    return "bg-slate-50 text-slate-700 ring-slate-200";
  if (s === "under_offer")
    return "bg-amber-50 text-amber-700 ring-amber-200";
  if (s === "sold")
    return "bg-purple-50 text-purple-700 ring-purple-200";
  if (s === "archived")
    return "bg-zinc-50 text-zinc-700 ring-zinc-200";
  return "bg-slate-50 text-slate-700 ring-slate-200";
}

export default async function AdminListingDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: listing, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !listing) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <div className="font-semibold">Listing not found</div>
          <div className="text-sm mt-1">
            This listing may not exist, or there was an error loading it.
          </div>
        </div>

        <div className="mt-4">
          <Link className="text-sm text-blue-600 hover:underline" href="/admin/listings">
            ← Back to listings
          </Link>
        </div>
      </div>
    );
  }

  const title = listing.title ?? "(Untitled)";
  const status = String(listing.status ?? "—");

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={[
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
                pillClass(status),
              ].join(" ")}
            >
              {status}
            </span>
            <span className="text-xs text-slate-500">
              Listing ID: <span className="font-mono">{listing.id}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            className="text-sm text-blue-600 hover:underline"
            href="/admin/listings"
          >
            ← Back to listings
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: key fields */}
        <div className="rounded-lg border bg-white">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Overview</h2>
            <p className="mt-1 text-xs text-slate-500">
              Key fields for quick admin review.
            </p>
          </div>

          <dl className="divide-y">
            <div className="grid grid-cols-3 gap-4 px-4 py-3">
              <dt className="text-xs font-medium text-slate-500">Created</dt>
              <dd className="col-span-2 text-sm text-slate-900">
                {fmtDate(listing.created_at)}
              </dd>
            </div>

            <div className="grid grid-cols-3 gap-4 px-4 py-3">
              <dt className="text-xs font-medium text-slate-500">Updated</dt>
              <dd className="col-span-2 text-sm text-slate-900">
                {fmtDate(listing.updated_at)}
              </dd>
            </div>

            <div className="grid grid-cols-3 gap-4 px-4 py-3">
              <dt className="text-xs font-medium text-slate-500">Location</dt>
              <dd className="col-span-2 text-sm text-slate-900">
                {[listing.suburb, listing.city].filter(Boolean).join(", ") || "—"}
              </dd>
            </div>

            <div className="grid grid-cols-3 gap-4 px-4 py-3">
              <dt className="text-xs font-medium text-slate-500">Type</dt>
              <dd className="col-span-2 text-sm text-slate-900">
                {listing.property_type ?? "—"}
              </dd>
            </div>

            <div className="grid grid-cols-3 gap-4 px-4 py-3">
              <dt className="text-xs font-medium text-slate-500">Beds / Baths</dt>
              <dd className="col-span-2 text-sm text-slate-900">
                {listing.bedrooms ?? "—"} / {listing.bathrooms ?? "—"}
              </dd>
            </div>

            <div className="grid grid-cols-3 gap-4 px-4 py-3">
              <dt className="text-xs font-medium text-slate-500">Price</dt>
              <dd className="col-span-2 text-sm text-slate-900">
                {listing.price_display ?? (listing.price ? `$${Number(listing.price).toLocaleString()}` : "—")}
              </dd>
            </div>
          </dl>
        </div>

        {/* Right: raw JSON (collapsed-style) */}
        <div className="rounded-lg border bg-white">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Raw record</h2>
            <p className="mt-1 text-xs text-slate-500">
              Full row payload (useful for debugging).
            </p>
          </div>

          <pre className="max-h-[520px] overflow-auto bg-slate-50 p-4 text-[11px] leading-relaxed text-slate-800">
            {JSON.stringify(listing, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
