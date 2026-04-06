// app/admin/listings/[id]/page.tsx
import Link from "next/link";
import AdminImageGallery from "./AdminImageGallery";
import EditListingForm from "./EditListingForm";

export default function AdminListingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Listing</h1>
            <p className="mt-1 text-sm text-muted">ID: {id}</p>
          </div>

          <div className="flex gap-3 text-sm">
            <Link href="/admin/listings" className="text-muted hover:text-foreground">
              Back to listings
            </Link>

            <Link
              href={`/admin/listings/${id}/edit`}
              className="text-muted hover:text-foreground"
            >
              Edit
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section className="rounded-2xl border border-border/40 bg-surface p-5">
            <h2 className="text-sm font-semibold">Images</h2>
            <div className="mt-4">
              <AdminImageGallery listingId={id} />
            </div>
          </section>

          <section className="rounded-2xl border border-border/40 bg-surface p-5">
            <h2 className="text-sm font-semibold">Details</h2>
            <div className="mt-4">
              <EditListingForm listingId={id} />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}