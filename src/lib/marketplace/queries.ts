import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type {
  PublicListing,
  SearchListing,
  SuburbSummary,
} from "@/types/marketplace-public";
import type { SearchFilters } from "./url";

async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
}

// Helper: coerce a Supabase RPC result into a typed array regardless of
// how the client widens it (single vs array).
function asArray<T>(value: unknown): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? (value as T[]) : [value as T];
}

export async function getListingBySlug(slug: string): Promise<PublicListing | null> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.rpc("marketplace_listing_by_slug", {
    p_slug: slug,
  });
  if (error) return null;
  const rows = asArray<PublicListing>(data);
  return rows[0] ?? null;
}

export async function getListingMedia(listingId: string) {
  type MediaRow = {
    id: string;
    public_url: string | null;
    is_cover: boolean;
    sort_order: number;
    type: string;
    caption: string | null;
  };

  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("listing_media")
    .select("id, public_url, is_cover, sort_order, type, caption")
    .eq("listing_id", listingId)
    .order("sort_order");
  return (data ?? []) as unknown as MediaRow[];
}

export async function getOpenHomes(listingId: string) {
  type OpenHome = {
    id: string;
    starts_at: string;
    ends_at: string;
    max_attendees: number | null;
  };

  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("listing_open_homes")
    .select("id, starts_at, ends_at, max_attendees")
    .eq("listing_id", listingId)
    .gte("ends_at", new Date().toISOString())
    .order("starts_at");
  return (data ?? []) as unknown as OpenHome[];
}

export async function getSuburbSummary(slug: string): Promise<SuburbSummary | null> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.rpc("marketplace_suburb_summary", {
    p_slug: slug,
  });
  if (error) return null;
  const rows = asArray<SuburbSummary>(data);
  return rows[0] ?? null;
}

export async function searchListings(f: SearchFilters) {
  const supabase = await getServerSupabase();

  const limit = 24;
  const offset = ((f.page ?? 1) - 1) * limit;

  const { data, error } = await supabase.rpc("marketplace_search_in_bbox", {
    p_min_lng: f.bbox?.[0] ?? null,
    p_min_lat: f.bbox?.[1] ?? null,
    p_max_lng: f.bbox?.[2] ?? null,
    p_max_lat: f.bbox?.[3] ?? null,
    p_search: f.q ?? null,
    p_suburb: f.suburb ?? null,
    p_min_beds: f.beds ?? null,
    p_min_baths: f.baths ?? null,
    p_min_price: f.minPrice ?? null,
    p_max_price: f.maxPrice ?? null,
    p_min_floor: f.minFloor ?? null,
    p_min_land: f.minLand ?? null,
    p_property_type: f.propertyType ?? null,
    p_ready_to_buy: f.readyToBuy ?? null,
    p_sort: f.sort ?? "best",
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw new Error(error.message);

  const results = asArray<SearchListing>(data);
  const total = results[0]?.total_count ?? 0;

  return {
    results,
    total,
    page: f.page ?? 1,
    limit,
    pageCount: Math.ceil(total / limit),
  };
}

export async function listSuburbs(region: string) {
  type SuburbRow = {
    id: string;
    name: string;
    slug: string;
    median_sale_price: number | null;
    active_listings_count: number;
  };

  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("suburbs")
    .select("id, name, slug, median_sale_price, active_listings_count")
    .eq("region", region)
    .order("name");
  return (data ?? []) as unknown as SuburbRow[];
}