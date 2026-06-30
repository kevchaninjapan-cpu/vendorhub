import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getSuburbSummary,
  searchListings,
} from "@/lib/marketplace/queries";
import { nzd } from "@/lib/marketplace/format";
import ListingCard from "../../ListingCard";

export const revalidate = 600; // 10 min

type Params = { region: string; suburb: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { suburb } = await params;
  const summary = await getSuburbSummary(suburb);
  if (!summary) return { title: "Suburb — VendorHub" };
  return {
    title: `Property for sale in ${summary.name}, ${summary.region} — VendorHub`,
    description: `Median sale price ${nzd(summary.median_sale_price)}. Browse ${
      summary.live_listings_count
    } active listings in ${summary.name}.`,
  };
}

export default async function SuburbLandingPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { region, suburb } = await params;
  const summary = await getSuburbSummary(suburb);
  if (!summary) notFound();

  const { results } = await searchListings({
    suburb: summary.name,
    sort: "best",
    page: 1,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <nav className="text-xs text-muted-foreground">
        <Link href="/buy" className="hover:underline">Buy</Link>
        <span className="mx-1">/</span>
        <Link href={`/buy/${region}`} className="hover:underline">
          {summary.region}
        </Link>
      </nav>

      <header className="mt-2 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Property for sale in {summary.name}, {summary.region}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Median sale price{" "}
          <strong>{nzd(summary.median_sale_price)}</strong> ·{" "}
          {summary.live_listings_count} active listings
        </p>
      </header>

      {results.length === 0 ? (
        <div className="rounded border bg-muted/30 p-6 text-sm">
          No active listings in {summary.name} right now.{" "}
          <Link
            href={`/buy?suburb=${encodeURIComponent(summary.name)}`}
            className="underline"
          >
            See nearby suburbs
          </Link>
          .
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}

      <section className="mt-10 rounded-md border bg-muted/20 p-4 text-sm">
        <h2 className="text-base font-semibold">About {summary.name}</h2>
        <p className="mt-1 text-muted-foreground">
          {summary.name} is a suburb in the {summary.region} region.
          VendorHub uses public valuation data to calculate the suburb median
          sale price shown above. Listings are sold privately by their owners
          using the VendorHub toolkit.
        </p>
      </section>
    </main>
  );
}