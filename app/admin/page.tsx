import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

type SearchParams = {
  page?: string | string[];
};

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // ✅ FIX: unwrap searchParams
  const params = await searchParams;

  const rawPage = Array.isArray(params.page)
    ? params.page[0]
    : params.page;

  const page = Math.max(parseInt(rawPage ?? "1", 10), 1);
  const pageSize = 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();

  const { data: listings, error } = await supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Listings</h1>

      <table className="w-full border">
        <thead>
          <tr className="border-b">
            <th className="p-2 text-left">Title</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {listings?.map((listing) => (
            <tr key={listing.id} className="border-b">
              <td className="p-2">{listing.title}</td>
              <td className="p-2">{listing.status}</td>
              <td className="p-2">
                {/* ✅ SEE ISSUE #2 BELOW */}
                <Link
                  href={`/admin/listings/${listing.id}`}
                  className="text-blue-600 hover:underline"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
