import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 3600;

type ListingRow = {
  slug: string | null;
  region: string | null;
  suburb: string | null;
  suburb_id: string | null;
  updated_at: string;
};

type SuburbRow = {
  id: string;
  slug: string;
  region_slug: string | null;
};

const toSlug = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "-");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://vendorhub.co.nz").replace(/\/$/, "");

  const { data: listingData } = await supabase
    .from("listings")
    .select("slug, region, suburb, suburb_id, updated_at")
    .in("status", ["live", "under_offer"]);

  const listings = (listingData ?? []) as ListingRow[];

  // Newest listing date per suburb, used as that suburb page's lastModified.
  const latestBySuburb = new Map<string, Date>();
  for (const l of listings) {
    if (!l.suburb_id) continue;
    const d = new Date(l.updated_at);
    const prev = latestBySuburb.get(l.suburb_id);
    if (!prev || d > prev) latestBySuburb.set(l.suburb_id, d);
  }

  // Only suburbs with something for sale. Listing all ~4,500 LINZ suburbs
  // would publish thousands of empty pages, which search engines penalise.
  let suburbs: SuburbRow[] = [];
  const suburbIds = Array.from(latestBySuburb.keys());
  if (suburbIds.length > 0) {
    const { data } = await supabase
      .from("suburbs")
      .select("id, slug, region_slug")
      .in("id", suburbIds);
    suburbs = (data ?? []) as SuburbRow[];
  }

  const listingUrls: MetadataRoute.Sitemap = listings
    .filter((l) => l.slug && l.region && l.suburb)
    .map((l) => ({
      url: `${base}/listings/${toSlug(l.region!)}/${toSlug(l.suburb!)}/${l.slug}`,
      lastModified: new Date(l.updated_at),
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));

  const suburbUrls: MetadataRoute.Sitemap = suburbs
    .filter((s) => s.region_slug && s.slug)
    .map((s) => ({
      url: `${base}/buy/${s.region_slug}/${s.slug}`,
      lastModified: latestBySuburb.get(s.id) ?? new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  const regionSlugs = new Set<string>(["auckland"]);
  for (const s of suburbs) if (s.region_slug) regionSlugs.add(s.region_slug);

  const regionUrls: MetadataRoute.Sitemap = Array.from(regionSlugs).map((r) => ({
    url: `${base}/buy/${r}`,
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  return [
    { url: `${base}/buy`, changeFrequency: "daily", priority: 1 },
    ...regionUrls,
    ...suburbUrls,
    ...listingUrls,
  ];
}