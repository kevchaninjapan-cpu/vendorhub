import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminListingsPage() {
  const supabase = createAdminClient();

  const { data: listings, error } = await supabase
    .from("listings")
    .select("id, title, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Admin Listings</h1>

      <table className="w-full border text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="p-2 text-left">Title</th>
            <th className="p-2 text-center">Status</th>
            <th className="p-2 text-right"></th>
          </tr>
        </thead>

        <tbody>
          {listings?.map((l) => (
            <tr key={l.id} className="border-t">
              <td className="p-2">{l.title}</td>
              <td className="p-2 text-center">{l.status}</td>
              <td className="p-2 text-right">
                <Link
                  href={`/admin/listings/${l.id}`}
                  className="text-blue-600 hover:underline"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}

          {!listings?.length && (
            <tr>
              <td colSpan={3} className="p-4 text-center text-slate-500">
                No listings found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}