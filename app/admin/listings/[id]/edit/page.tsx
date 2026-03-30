// app/admin/listings/[id]/edit/page.tsx
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminTopBar } from "@/app/admin/_components/AdminTopBar";
import { updateListingAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminListingEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = createAdminClient();

  const { data: listing, error } = await supabase
    .from("listings")
    .select("id, title, suburb, city, price_display, status, property_type")
    .eq("id", id)
    .single();

  if (error || !listing) {
    return (
      <div className="py-6">
        <AdminTopBar
          crumbs={[
            { label: "Admin", href: "/admin" },
            { label: "Listings", href: "/admin/listings" },
            { label: "Edit" },
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
          { label: listing.title ?? "(Untitled)", href: `/admin/listings/${id}` },
          { label: "Edit" },
        ]}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit listing</h1>
        <Link
          href={`/admin/listings/${id}`}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← Back
        </Link>
      </div>

      <form
        action={updateListingAction.bind(null, id)}
        className="rounded-lg border bg-white p-6 space-y-4"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <div className="text-sm font-medium">Title</div>
            <input
              name="title"
              defaultValue={listing.title ?? ""}
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="Listing title"
            />
          </label>

          <label className="space-y-1">
            <div className="text-sm font-medium">Price display</div>
            <input
              name="price_display"
              defaultValue={listing.price_display ?? ""}
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="$1,250,000"
            />
          </label>

          <label className="space-y-1">
            <div className="text-sm font-medium">Suburb</div>
            <input
              name="suburb"
              defaultValue={listing.suburb ?? ""}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1">
            <div className="text-sm font-medium">City</div>
            <input
              name="city"
              defaultValue={listing.city ?? ""}
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1">
            <div className="text-sm font-medium">Status</div>
            <select
              name="status"
              defaultValue={listing.status ?? "draft"}
              className="w-full rounded border px-3 py-2 text-sm"
            >
              <option value="draft">draft</option>
              <option value="active">active</option>
              <option value="under_offer">under_offer</option>
              <option value="sold">sold</option>
              <option value="withdrawn">archived</option>
            </select>
          </label>

          <label className="space-y-1">
            <div className="text-sm font-medium">Property type</div>
            <select
              name="property_type"
              defaultValue={listing.property_type ?? "house"}
              className="w-full rounded border px-3 py-2 text-sm"
            >
              <option value="house">house</option>
              <option value="apartment">apartment</option>
              <option value="townhouse">townhouse</option>
              <option value="unit">unit</option>
            </select>
          </label>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Save changes
          </button>

          <Link
            href={`/admin/listings/${id}`}
            className="rounded border px-4 py-2 text-sm hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}