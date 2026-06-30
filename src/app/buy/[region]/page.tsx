import Link from "next/link";
import type { Metadata } from "next";
import { listSuburbs } from "@/lib/marketplace/queries";
import { nzd } from "@/lib/marketplace/format";

export const revalidate = 1800; // 30 min

type Params = { region: string };

const REGION_DISPLAY: Record<string, string> = {
  auckland: "Auckland",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { region } = await params;
  const r = REGION_DISPLAY[region.toLowerCase()] ?? region;
  return {
    title: `Property for sale in ${r} — VendorHub`,
    description: `Browse private-sale listings and suburb guides across ${r}.`,
  };
}

export default async function RegionLandingPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { region } = await params;
  const displayRegion = REGION_DISPLAY[region.toLowerCase()] ?? region;
  const suburbs = await listSuburbs(displayRegion);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Property for sale in {displayRegion}
        </h1>
        <p className="text-sm text-muted-foreground">
          {suburbs.length} suburbs with active median sale data.
        </p>
      </header>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {suburbs.map((s) => (
          <Link
            key={s.id}
            href={`/buy/${region.toLowerCase()}/${s.slug}`}
            className="rounded-md border bg-background p-3 hover:shadow"
          >
            <div className="font-medium">{s.name}</div>
            <div className="text-xs text-muted-foreground">
              Median {nzd(s.median_sale_price)} ·{" "}
              {s.active_listings_count} active
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}