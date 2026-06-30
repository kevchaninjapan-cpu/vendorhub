export type ListingStatus =
  | "draft" | "pending_review" | "live"
  | "under_offer" | "sold" | "withdrawn" | "rejected";

export type PackTier = "starter" | "pro" | "elite";
export type MethodOfSale = "asking_price" | "negotiation" | "tender" | "beo";
export type PropertyType =
  | "house" | "apartment" | "townhouse" | "unit"
  | "section" | "lifestyle" | "other";
export type MediaType = "photo" | "floor_plan" | "video" | "tour_3d";

export interface Disclosures {
  lim_provided?: boolean;
  title_provided?: boolean;
  weathertightness_disclosed?: boolean;
  unconsented_works?: boolean;
  building_report_provided?: boolean;
  notes?: string;
}

export interface ListingDraft {
  id?: string;
  pack_tier: PackTier;

  dvr_record_id?: string | null;
  auckland_rate_assessment_id?: string | null;
  formatted_address?: string | null;
  address_norm?: string | null;
  street_address?: string | null;
  suburb?: string | null;
  region?: string | null;
  postcode?: string | null;
  lat?: number | null;
  lng?: number | null;
  display_address_masked?: boolean;

  property_type?: PropertyType | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parking?: number | null;
  floor_area_sqm?: number | null;
  land_area_sqm?: number | null;
  year_built?: number | null;
  chattels?: string[];
  headline?: string | null;
  description?: string | null;

  method_of_sale?: MethodOfSale | null;
  asking_price?: number | null;
  price_text?: string | null;
  tender_close_at?: string | null;
  beo_amount?: number | null;

  disclosures?: Disclosures;
}

export interface ListingMediaRow {
  id: string;
  listing_id: string;
  type: MediaType;
  storage_path: string;
  public_url: string | null;
  sort_order: number;
  is_cover: boolean;
  caption?: string | null;
}