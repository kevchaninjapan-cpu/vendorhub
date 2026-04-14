// app/admin/page.tsx
import Link from "next/link";

type SearchParams = Record<string, string | string[] | undefined>;

export default function AdminHomePage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-2 text-sm text-muted">
          Internal tools for managing listings and content.
        </p>

        <div className="mt-8 flex gap-4">
          <Link
            href="/admin/listings"
            className="rounded-xl border border-border/60 bg-surface px-4 py-2 text-sm hover:bg-surface-2"
          >
            Manage listings
          </Link>

          <Link
            href="/listings"
            className="rounded-xl border border-border/60 bg-background px-4 py-2 text-sm hover:bg-surface"
          >
            View public listings
          </Link>
        </div>
      </div>
    </main>
  );
}