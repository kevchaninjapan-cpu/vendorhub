// ─────────────────────────────────────────────────────────────
// VendorHub — Data Fetcher: Types
//
// Raw shapes from LINZ WFS Table 114085 and Auckland Council
// ArcGIS FeatureServer. Verified against live APIs.
// ─────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════
//  LINZ DVR (Table 114085)
// ══════════════════════════════════════════════════════════════

export interface LinzDvrRecord {
  unit_of_property_id: string;
  valuation_no_roll: number;
  valuation_no_assessment: number;
  valuation_no_suffix: string | null;
  district_ta_code: number;
  situation_number: string;
  additional_situation_number: string | null;
  situation_name: string;
  legal_description: string;
  land_area: number | null;
  property_category: string;
  ownership_code: number;
  current_effective_valuation_date: string;
  capital_value: number;
  improvements_value: number;
  land_value: number;
  trees: string | null;
  annual_value: number | null;
  annual_value_indicator: string | null;
  gross_rental: number | null;
  no_of_bedrooms: number | null;
  improvements_description: string | null;
  zoning: string | null;
  actual_property_use: string | null;
  units_of_use: number | null;
  off_street_parking: number | null;
  building_age_indicator: string | null;
  building_condition_indicator: string | null;
  building_construction_indicator: string | null;
  building_site_coverage: number | null;
  building_total_floor_area: number | null;
  mass_contour: string | null;
  mass_view: string | null;
  mass_scope_of_view: string | null;
  mass_total_living_area: number | null;
  mass_deck: string | null;
  mass_workshop_laundry: string | null;
  mass_other_improvements: string | null;
  mass_garage_freestanding: number | null;
  mass_garaged_under_main_roof: number | null;
  production: string | null;
  sale_group: string | null;
}

export interface LinzWfsResponse {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id: string;
    geometry: null;
    properties: LinzDvrRecord;
  }>;
  totalFeatures: string | number;
  numberReturned: number;
  timeStamp: string;
  crs: null;
}

// ══════════════════════════════════════════════════════════════
//  Auckland Council — ArcGIS FeatureServer
//  Endpoint: AGOL_RateAccountInfo1_gdb/FeatureServer/0
//  No API key required. CC-BY 4.0.
// ══════════════════════════════════════════════════════════════

export interface AklCouncilRecord {
  OBJECTID: number;
  RATEACCOUNTNUM: string;
  PROPERTYID: string;
  VALUATIONREF: string;
  RATESASSESSMENTNUM: string;
  FORMATTEDADDRESS: string;       // multiline with \r separators
  LEGAL: string;
  CV: number;                     // current CV (for rates)
  LV: number;                     // current LV
  VALUATIONDATE: number;          // epoch ms
  LCV: number;                    // latest CV (2024 reval)
  LLV: number;                    // latest LV (2024 reval)
  LATESTVALUATIONDATE: number;    // epoch ms
  CT: string;                     // Record of Title
  AREALABEL: string;              // e.g. "650 M2", "0 M2"
  Shape__Area: number;            // polygon area in m2
  Shape__Length: number;
}

export interface AklCouncilResponse {
  objectIdFieldName: string;
  features: Array<{
    attributes: AklCouncilRecord;
    geometry?: unknown;
  }>;
}

// ══════════════════════════════════════════════════════════════
//  Shared types
// ══════════════════════════════════════════════════════════════

export interface AddressQuery {
  streetNumber: string;
  streetName: string;
  suburb?: string;
  city?: string;
}

export interface ResolvedProperty {
  dvr: LinzDvrRecord;
  hpiPercentChange: number | null;
  hpiDate: string | null;
  region: string;
}