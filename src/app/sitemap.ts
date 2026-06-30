import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vendorhub.co.nz";

  const { data: listings } = await supabase
    .from("listings")
    .select("slug, region, suburb, updated_at")
    .in("status", ["live", "under_offer"]);

  const { data: suburbs } = await supabase
    .from("suburbs")
    .select("slug, region, updated_at");

  const listingUrls =
    listings?.map((l: any) => ({
      url: `${base}/listings/${l.region?.toLowerCase()}/${l.suburb
        ?.toLowerCase()
        .replace(/\s+/g, "-")}/${l.slug}`,
      lastModified: new Date(l.updated_at),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })) ?? [];

  const suburbUrls =
    suburbs?.map((s: any) => ({
      url: `${base}/buy/${s.region?.toLowerCase()}/${s.slug}`,
      lastModified: new Date(s.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })) ?? [];

  return [
    { url: `${base}/buy`, priority: 1, changeFrequency: "daily" },
    { url: `${base}/buy/auckland`, priority: 0.9, changeFrequency: "daily" },
    ...suburbUrls,
    ...listingUrls,
  ];
}