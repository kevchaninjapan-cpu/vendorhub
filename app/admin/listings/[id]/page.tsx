// app/admin/listings/[id]/page.tsx
// app/admin/listings/[id]/page.tsx
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminTopBar } from "@/app/admin/_components/AdminTopBar";
import { archiveListingAction, restoreListingToDraftAction } from "./actions";

import AdminImageGallery from "./AdminImageGallery";
import ImageUploader from "./ImageUploader";

export const dynamic = "force-dynamic";

function pillClass(status?: string) {
  const s = String(status ?? "").toLowerCase();
  if (s === "active") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (s === "draft") return "bg-slate-50 text-slate-700 ring-slate-200";
  if (s === "under_offer") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (s === "sold") return "bg-purple-50 text-purple-700 ring-purple-200";
  if (s === "withdrawn") return "bg-zinc-50 text-zinc-700 ring-zinc-200";
  return "bg-slate-50 text-slate-700 ring-slate-200";
}

function fmtDate(v: any) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

export default async function AdminListingDetailPage({
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
      <div className="py-6">
        <AdminTopBar
          crumbs={[
            { label: "Admin", href: "/admin" },
            { label: "Listings", href: "/admin/listings" },
            { label: "Not found" },
          ]}
        />
        <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">
          Listing not found.
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      <AdminTopBar
        crumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Listings", href: "/admin/listings" },
          { label: listing.title ?? "(Untitled)" },
        ]}
      />

      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            {listing.title ?? "(Untitled)"}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={[
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
                pillClass(listing.status),
              ].join(" ")}
            >
              {String(listing.status ?? "—")}
            </span>

            <span className="text-xs text-slate-500">
              ID: <span className="font-mono">{listing.id}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/admin/listings/${listing.id}/edit`}
            className="rounded border bg-white px-3 py-2 text-sm hover:bg-slate-50"
          >
            Edit
          </Link>

          {String(listing.status) !== "withdrawn" ? (
            <form action={archiveListingAction.bind(null, listing.id)}>
              <button
                type="submit"
                className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100"
              >
                Archive
              </button>
            </form>
          ) : (
            <form action={restoreListingToDraftAction.bind(null, listing.id)}>
              <button
                type="submit"
                className="rounded border bg-white px-3 py-2 text-sm hover:bg-slate-50"
              >
                Restore to draft
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Overview */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-white">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Overview</h2>
            <p className="mt-1 text-xs text-slate-500">Key fields.</p>
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
                {listing.price_display ??
                  (listing.price ? `$${Number(listing.price).toLocaleString()}` : "—")}
              </dd>
            </div>
          </dl>
        </div>

        {/* Raw JSON */}
        <div className="rounded-lg border bg-white">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Raw record</h2>
            <p className="mt-1 text-xs text-slate-500">Full row payload.</p>
          </div>
          <pre className="max-h-[520px] overflow-auto bg-slate-50 p-4 text-[11px] leading-relaxed text-slate-800">
            {JSON.stringify(listing, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
``