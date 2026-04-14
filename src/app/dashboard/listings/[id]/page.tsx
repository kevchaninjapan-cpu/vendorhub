// app/dashboard/listings/[id]/page.tsx
import { supabaseServer } from "@/lib/supabaseServer";
import Link from "next/link";

export default async function DashboardListingPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <h1 className="text-xl font-semibold">Please sign in</h1>
        </div>
      </main>
    );
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, title, status, price_display, city, region, updated_at")
    .eq("id", params.id)
    .single();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {listing?.title ?? "Listing"}
            </h1>
            <p className="mt-1 text-sm text-muted">ID: {params.id}</p>
          </div>

          <Link
            href="/dashboard/listings"
            className="rounded-xl border border-border/60 bg-background px-4 py-2 text-sm hover:bg-surface"
          >
            Back
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-border/40 bg-surface p-5 text-sm">
          <div className="grid gap-2">
            <div>
              <span className="text-muted">Status:</span> {listing?.status ?? "—"}
            </div>
            <div>
              <span className="text-muted">Price:</span>{" "}
              {listing?.price_display ?? "—"}
            </div>
            <div>
              <span className="text-muted">Location:</span>{" "}
              {listing?.city ?? "—"}, {listing?.region ?? "—"}
            </div>
            <div>
              <span className="text-muted">Updated:</span>{" "}
              {listing?.updated_at ?? "—"}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
``