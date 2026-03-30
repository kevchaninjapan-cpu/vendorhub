import { createAdminClient } from "@/lib/supabase/admin"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function AdminListingsPage() {
  const supabase = createAdminClient()

  const { data: listings } = await supabase
    .from("listings")
    .select("id, title, status, created_at")
    .order("created_at", { ascending: false })

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Admin Listings</h1>

      <table className="w-full border text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="p-2 text-left">Title</th>
            <th className="p-2">Status</th>
            <th className="p-2"></th>
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
        </tbody>
      </table>
    </div>
  )
}
