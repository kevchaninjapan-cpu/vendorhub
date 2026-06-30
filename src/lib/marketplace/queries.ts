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

// ─── Direct query, no RPC ──────────────────────────────────────────────────
type SearchRow = {
  id: string;
  short_id: string;
  slug: string;
  status: string;
  pack_tier: "starter" | "pro" | "elite";
  search_rank_boost: number;
  formatted_address: string | null;
  street_address: string | null;
  suburb: string | null;
  region: string | null;
  postcode: string | null;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  floor_area_sqm: number | null;
  land_area_sqm: number | null;
  year_built: number | null;
  method_of_sale: string | null;
  asking_price: number | null;
  price_text: string | null;
  valuation_estimate: number | null;
  ready_to_buy: boolean;
  published_at: string | null;
};

export async function searchListings(f: SearchFilters) {
  const supabase = await getServerSupabase();
  const limit = 24;
  const offset = ((f.page ?? 1) - 1) * limit;

  // Start from the materialised view (auth + select grants already in place)
  let q = supabase
    .from("listings_search")
    .select(
      "id, short_id, slug, status, pack_tier, search_rank_boost, " +
      "formatted_address, street_address, suburb, region, postcode, " +
      "property_type, bedrooms, bathrooms, parking, " +
      "floor_area_sqm, land_area_sqm, year_built, " +
      "method_of_sale, asking_price, price_text, valuation_estimate, " +
      "ready_to_buy, published_at",
      { count: "exact" }
    );

  // Faceted filters
  if (f.q && f.q.trim().length > 0) {
    // Text search across headline + description + suburb
    q = q.textSearch("search_doc", f.q.trim(), { type: "plain", config: "english" });
  }
  if (f.suburb) q = q.ilike("suburb", f.suburb);
  if (f.beds != null) q = q.gte("bedrooms", f.beds);
  if (f.baths != null) q = q.gte("bathrooms", f.baths);
  if (f.minPrice != null) q = q.gte("asking_price", f.minPrice);
  if (f.maxPrice != null) q = q.lte("asking_price", f.maxPrice);
  if (f.minFloor != null) q = q.gte("floor_area_sqm", f.minFloor);
  if (f.minLand != null) q = q.gte("land_area_sqm", f.minLand);
  if (f.propertyType) q = q.eq("property_type", f.propertyType);
  if (f.readyToBuy) q = q.eq("ready_to_buy", true);

  // Sorting
  switch (f.sort) {
    case "price_asc":
      q = q.order("asking_price", { ascending: true, nullsFirst: false });
      break;
    case "price_desc":
      q = q.order("asking_price", { ascending: false, nullsFirst: false });
      break;
    case "newest":
      q = q.order("published_at", { ascending: false, nullsFirst: false });
      break;
    case "best":
    default:
      // Tier-weighted ranking: higher tier rises
      q = q
        .order("search_rank_boost", { ascending: false })
        .order("published_at", { ascending: false, nullsFirst: false });
      break;
  }

  // Pagination
  q = q.range(offset, offset + limit - 1);

  const { data, error, count } = await q;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as SearchRow[];

  // Fetch cover images in one go
  const ids = rows.map((r) => r.id);
  const cover_map = new Map<string, string>();
  if (ids.length > 0) {
    const { data: media } = await supabase
      .from("listing_media")
      .select("listing_id, public_url, is_cover")
      .in("listing_id", ids)
      .eq("is_cover", true);
    (media ?? []).forEach((m: any) => {
      if (m.public_url) cover_map.set(m.listing_id, m.public_url);
    });
  }

  // Fetch geom (lng/lat) in one go
  type GeomRow = { id: string; lng: number | null; lat: number | null };
  const geom_map = new Map<string, { lng: number; lat: number }>();
  if (ids.length > 0) {
    const { data: geoms } = await supabase
      .rpc("marketplace_listings_geom", { p_ids: ids })
      .returns<GeomRow[]>();
    const geomRows = Array.isArray(geoms) ? geoms : [];
    geomRows.forEach((g) => {
      if (g.lng != null && g.lat != null) {
        geom_map.set(g.id, { lng: g.lng, lat: g.lat });
      }
    });
  }

  // Bbox filter (in JS — small dataset, simpler than another query)
  let filtered = rows;
  if (f.bbox) {
    const [minLng, minLat, maxLng, maxLat] = f.bbox;
    filtered = rows.filter((r) => {
      const g = geom_map.get(r.id);
      if (!g) return true; // keep listings without coords in the list view
      return (
        g.lng >= minLng && g.lng <= maxLng &&
        g.lat >= minLat && g.lat <= maxLat
      );
    });
  }

  // Map to the SearchListing shape the UI expects
  const results: SearchListing[] = filtered.map((r) => ({
    ...r,
    cover_url: cover_map.get(r.id) ?? null,
    lng: geom_map.get(r.id)?.lng ?? null,
    lat: geom_map.get(r.id)?.lat ?? null,
    total_count: count ?? rows.length,
  }));

  const total = count ?? results.length;
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