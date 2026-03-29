// app/admin/listings/page.tsx
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PER_PAGE = 20;

type SearchParams = {
  page?: string | string[];
};

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const rawPage = Array.isArray(searchParams?.page)
    ? searchParams?.page[0]
    : searchParams?.page;

  const page = Math.max(1, Number(rawPage ?? "1") || 1);
  const from = (page - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;

  const supabase = await createServerClient();

  // Auth is gated by app/admin/layout.tsx, but keeping this here is harmless
  const { error: userErr } = await supabase.auth.getUser();
  if (userErr) console.error("[ADMIN_LISTINGS_AUTH_ERROR]", userErr);

  const { data: listings, error, count } = await supabase
    .from("listings")
    .select("id, title, suburb, city, status, created_at, updated_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[ADMIN_LISTINGS_QUERY_ERROR]", error);
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Admin · Listings</h1>
        <p className="mt-2 text-red-600">Unable to load listings.</p>
      </div>
    );
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const prevHref = `/admin/listings?page=${Math.max(1, page - 1)}`;
  const nextHref = `/admin/listings?page=${Math.min(totalPages, page + 1)}`;

  return (
    <div className="p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-xl font-semibold">Admin · Listings</h1>
        <div className="text-sm text-gray-600">
          Showing {total === 0 ? 0 : Math.min(total, from + 1)}–
          {Math.min(total, to + 1)} of {total}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">Location</th>
              <th className="p-3">Status</th>
              <th className="p-3">Updated</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {listings?.length ? (
              listings.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="p-3">
                    <div className="font-medium">{l.title ?? "(Untitled)"}</div>
                    <div className="text-xs text-gray-500">{l.id}</div>
                  </td>

                  <td className="p-3">
                    {[l.suburb, l.city].filter(Boolean).join(", ") || "—"}
                  </td>

                  <td className="p-3">
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium">
                      {l.status}
                    </span>
                  </td>

                  <td className="p-3">
                    {l.updated_at ? new Date(l.updated_at).toLocaleString() : "—"}
                  </td>

                  <td className="p-3 text-right">
                    <Link
                      className="text-blue-600 hover:underline"
                      href={`/admin/listings/${l.id}`}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-t">
                <td className="p-6 text-gray-600" colSpan={5}>
                  No listings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <Link
          className={`text-sm ${
            page <= 1
              ? "pointer-events-none text-gray-400"
              : "text-blue-600 hover:underline"
          }`}
          href={prevHref}
        >
          ← Previous
        </Link>

        <div className="text-sm text-gray-700">
          Page {page} of {totalPages}
        </div>

        <Link
          className={`text-sm ${
            page >= totalPages
              ? "pointer-events-none text-gray-400"
              : "text-blue-600 hover:underline"
          }`}
          href={nextHref}
        >
          Next →
        </Link>
      </div>
    </div>
  );
}
