// app/admin/listings/[id]/page.tsx
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminTopBar } from "@/app/admin/_components/AdminTopBar";
import { archiveListingAction, restoreListingToDraftAction } from "./actions";

export const dynamic = "force-dynamic";

function pillClass(status?: string) {
  const s = String(status ?? "").toLowerCase();
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset";

  if (s === "active")
    return `${base} bg-emerald-50 text-emerald-700 ring-emerald-200/70`;
  if (s === "draft")
    return `${base} bg-slate-50 text-slate-700 ring-slate-200/70`;
  if (s === "under_offer")
    return `${base} bg-amber-50 text-amber-700 ring-amber-200/70`;
  if (s === "sold")
    return `${base} bg-purple-50 text-purple-700 ring-purple-200/70`;
  if (s === "withdrawn")
    return `${base} bg-zinc-50 text-zinc-700 ring-zinc-200/70`;

  return `${base} bg-slate-50 text-slate-700 ring-slate-200/70`;
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
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <AdminTopBar
            crumbs={[
              { label: "Admin", href: "/admin" },
              { label: "Listings", href: "/admin/listings" },
              { label: "Not found" },
            ]}
          />

          <div className="rounded-2xl border border-red-200/60 bg-red-50 p-4 text-red-700">
            <div className="text-sm font-semibold">Listing not found.</div>
            <div className="mt-1 text-sm text-red-700/80">
              The listing may have been deleted or you may not have access.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
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
              <span className={pillClass(listing.status)}>
                {String(listing.status ?? "—")}
              </span>

              <span className="text-xs text-muted">
                ID:{" "}
                <span className="font-mono text-foreground/80">
                  {listing.id}
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/admin/listings/${listing.id}/edit`}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-surface"
            >
              Edit
            </Link>

            {String(listing.status) !== "withdrawn" ? (
              <form action={archiveListingAction.bind(null, listing.id)}>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl border border-red-200/60 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                >
                  Archive
                </button>
              </form>
            ) : (
              <form action={restoreListingToDraftAction.bind(null, listing.id)}>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-surface"
                >
                  Restore to draft
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Overview */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border/40 bg-surface shadow-sm">
            <div className="border-b border-border/40 px-5 py-4">
              <h2 className="text-sm font-semibold">Overview</h2>
              <p className="mt-1 text-xs text-muted">Key fields.</p>
            </div>

            <dl className="divide-y divide-border/40">
              <div className="grid grid-cols-3 gap-4 px-5 py-4">
                <dt className="text-xs font-medium text-muted">Created</dt>
                <dd className="col-span-2 text-sm">
                  {fmtDate(listing.created_at)}
                </dd>
              </div>

              <div className="grid grid-cols-3 gap-4 px-5 py-4">
                <dt className="text-xs font-medium text-muted">Updated</dt>
                <dd className="col-span-2 text-sm">
                  {fmtDate(listing.updated_at)}
                </dd>
              </div>

              <div className="grid grid-cols-3 gap-4 px-5 py-4">
                <dt className="text-xs font-medium text-muted">Location</dt>
                <dd className="col-span-2 text-sm">
                  {[listing.suburb, listing.city].filter(Boolean).join(", ") ||
                    "—"}
                </dd>
              </div>

              <div className="grid grid-cols-3 gap-4 px-5 py-4">
                <dt className="text-xs font-medium text-muted">Type</dt>
                <dd className="col-span-2 text-sm">
                  {listing.property_type ?? "—"}
                </dd>
              </div>

              <div className="grid grid-cols-3 gap-4 px-5 py-4">
                <dt className="text-xs font-medium text-muted">Beds / Baths</dt>
                <dd className="col-span-2 text-sm">
                  {listing.bedrooms ?? "—"} / {listing.bathrooms ?? "—"}
                </dd>
              </div>

              <div className="grid grid-cols-3 gap-4 px-5 py-4">
                <dt className="text-xs font-medium text-muted">Price</dt>
                <dd className="col-span-2 text-sm">
                  {listing.price_display ??
                    (listing.price
                      ? `$${Number(listing.price).toLocaleString()}`
                      : "—")}
                </dd>
              </div>
            </dl>
          </div>

          {/* Raw JSON */}
          <div className="rounded-2xl border border-border/40 bg-surface shadow-sm">
            <div className="border-b border-border/40 px-5 py-4">
              <h2 className="text-sm font-semibold">Raw record</h2>
              <p className="mt-1 text-xs text-muted">Full row payload.</p>
            </div>

            <pre className="max-h-[520px] overflow-auto rounded-b-2xl bg-surface-2 p-4 text-[11px] leading-relaxed text-foreground/90">
              {JSON.stringify(listing, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}