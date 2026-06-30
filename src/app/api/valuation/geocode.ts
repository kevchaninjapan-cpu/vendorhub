// Free, NZ-friendly geocoder using OpenStreetMap Nominatim.
//
// Terms of use:
//   - Max 1 request/sec (we cache aggressively)
//   - Identify yourself via the User-Agent header
//   - For high traffic, consider a paid alternative (Mapbox / Google)
//
// See https://operations.osmfoundation.org/policies/nominatim/

type Geo = {
  lat: number;
  lng: number;
  street?: string;
  suburb?: string;
  region?: string;
  postcode?: string;
  country?: string;
};

// In-memory cache to stay under rate limits during dev
const cache = new Map<string, Geo | null>();

export async function geocodeAddress(address: string): Promise<Geo | null> {
  const key = address.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key) ?? null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", address);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "nz"); // bias to NZ

  const r = await fetch(url.toString(), {
    headers: {
      // Nominatim requires a real User-Agent identifying your app
      "User-Agent": "VendorHub/1.0 (https://vendorhub.co.nz)",
      Accept: "application/json",
    },
    // Cache for 24h on the edge; safe because addresses don't move
    next: { revalidate: 86400 },
  });

  if (!r.ok) {
    cache.set(key, null);
    return null;
  }

  const arr = (await r.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
    address?: {
      house_number?: string;
      road?: string;
      suburb?: string;
      neighbourhood?: string;
      city?: string;
      town?: string;
      state?: string;
      postcode?: string;
      country?: string;
    };
  }>;

  if (!arr || arr.length === 0) {
    cache.set(key, null);
    return null;
  }

  const top = arr[0];
  const a = top.address ?? {};
  const street = [a.house_number, a.road].filter(Boolean).join(" ") || undefined;

  const result: Geo = {
    lat: Number(top.lat),
    lng: Number(top.lon),
    street,
    suburb: a.suburb ?? a.neighbourhood ?? undefined,
    region: a.state ?? a.city ?? a.town ?? "Auckland",
    postcode: a.postcode ?? undefined,
    country: a.country ?? "New Zealand",
  };

  cache.set(key, result);
  return result;
}
