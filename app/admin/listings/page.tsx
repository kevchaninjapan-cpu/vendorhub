// app/admin/listings/page.tsx
import { getAllListings } from "@/lib/db/listings";
import CreateQuickForm from "./parts/CreateQuickForm";

export const dynamic = "force-dynamic"; // re-fetches server data after mutations

export default async function AdminListingsPage() {
  const { data, error } = await getAllListings();

  return (
    <div className="p-1 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Listings</h1>
        <p className="text-slate-600">Create, update, and delete listings.</p>
      </header>

      <section className="max-w-md">
        <CreateQuickForm />
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">All listings</h2>
        {error && <p className="text-red-600">Error: {error.message}</p>}

        {!data?.length ? (
          <p className="text-slate-600">No listings yet.</p>
        ) : (
          <table className="w-full border text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="p-3 text-left">Title</th>
                <th className="p-3 text-left">Price</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((l) => (
                <tr key={l.id} className="border-b">
                  <td className="p-3">{l.title}</td>
                  <td className="p-3">
                    {typeof l.price === "number"
                      ? `$${(l.price / 100).toLocaleString()}`
                      : "—"}
                  </td>
                  <td className="p-3">{l.status}</td>
                  <td className="p-3">
                    <a
                      className="text-blue-600 hover:underline"
                      href={`/admin/listings/${l.id}`}
                    >
                      Edit →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}