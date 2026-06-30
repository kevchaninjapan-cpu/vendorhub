import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { nzd } from "@/lib/marketplace/format";
import type { PublicListing } from "@/types/marketplace-public";

export default async function EvaluationCard({
  listing,
}: {
  listing: PublicListing;
}) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const regionSlug = listing.region?.toLowerCase() ?? "";
  const suburbSlug = listing.suburb?.toLowerCase().replace(/\s+/g, "-") ?? "";
  const listingPath = `/listings/${regionSlug}/${suburbSlug}/${listing.slug}`;

  if (!user) {
    return (
      <section className="rounded-md border bg-muted/30 p-4">
        <h2 className="text-sm font-semibold">VendorHub e-valuation</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Sign in to see our independent estimate of this property&apos;s value
          using council CV, sales comparables, and regional indices.
        </p>
        <Link
          href={`/sign-in?next=${encodeURIComponent(listingPath)}`}
          className="mt-2 inline-block text-xs underline"
        >
          Sign in to view
        </Link>
      </section>
    );
  }

  if (!listing.valuation_estimate) {
    return (
      <section className="rounded-md border bg-muted/30 p-4">
        <h2 className="text-sm font-semibold">VendorHub e-valuation</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          We don&apos;t yet have an independent estimate for this property.
        </p>
      </section>
    );
  }

  const range =
    listing.valuation_low && listing.valuation_high
      ? `${nzd(listing.valuation_low)} – ${nzd(listing.valuation_high)}`
      : nzd(listing.valuation_estimate);

  const confPct = listing.valuation_confidence
    ? Math.round(listing.valuation_confidence * 100)
    : null;

  return (
    <section className="rounded-md border bg-emerald-50/40 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">VendorHub e-valuation</h2>
        {confPct != null && (
          <span className="text-xs text-muted-foreground">
            Confidence {confPct}%
          </span>
        )}
      </div>
      <p className="mt-1 text-lg font-semibold">{range}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Independent estimate from council CV, recent comparable sales, and the
        regional index. Not a registered valuation.
      </p>
    </section>
  );
}