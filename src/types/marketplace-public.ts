export type ListingStatus =
  | "live" | "under_offer" | "sold" | "withdrawn";

export interface PublicListing {
  id: string;
  short_id: string;
  slug: string;
  status: string;
  pack_tier: "starter" | "pro" | "elite";
  member_id: string;

  formatted_address: string | null;
  street_address: string | null;
  suburb: string | null;
  region: string | null;
  postcode: string | null;
  display_address_masked: boolean;

  lng: number | null;
  lat: number | null;

  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  floor_area_sqm: number | null;
  land_area_sqm: number | null;
  year_built: number | null;
  chattels: string[] | null;
  headline: string | null;
  description: string | null;

  method_of_sale: string | null;
  asking_price: number | null;
  price_text: string | null;
  tender_close_at: string | null;
  beo_amount: number | null;

  valuation_estimate: number | null;
  valuation_low: number | null;
  valuation_high: number | null;
  valuation_confidence: number | null;
  ready_to_buy: boolean;
  disclosures: Record<string, unknown> | null;
  published_at: string | null;
}

export interface SearchListing {
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
  lng: number | null;
  lat: number | null;
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
  cover_url: string | null;
  total_count: number;
}

export interface SuburbSummary {
  id: string;
  name: string;
  region: string;
  slug: string;
  median_sale_price: number | null;
  active_listings_count: number;
  live_listings_count: number;
}