import Link from "next/link";

export default function ListingsSection({ userId }: { userId: string }) {
  // Placeholder — wire up to your listings table when ready
  return (
    <section id="listings" className="rounded-xl bg-white shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">My Listings</h2>
        <Link
          href="/seller-studio/listings/new"
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
        >
          + New listing
        </Link>
      </div>

      {/* Empty state */}
      <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center">
        <div className="text-2xl">🏡</div>
        <p className="mt-2 text-sm font-semibold text-gray-900">No listings yet</p>
        <p className="mt-1 text-xs text-gray-500">
          Create your first listing to get started.
        </p>
        <Link
          href="/app/account/listings/new"
          className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Create a listing
        </Link>
      </div>
    </section>
  );
}