// ── Enums (runtime values) ──────────────────────────────────

export enum ConfidenceLevel {
  HIGH = "High",
  MEDIUM = "Medium",
  LOW = "Low",
}

export enum PropertyCategory {
  RESIDENTIAL = "Residential",
  APARTMENT = "Apartment",
  RURAL = "Rural",
  UNKNOWN = "Unknown",
}

// ── V1 Engine Types ─────────────────────────────────────────

export type ValuationSource = {
  name: string;
  url?: string;
  retrievedAt: string;
};

export type RatingValuation = {
  capitalValue: number;
  landValue: number;
  improvementsValue?: number;
  effectiveDate?: string;
  valuationDate: string;
  category?: PropertyCategory;
  landArea?: number;
  source?: string;
};

export type RegionalIndex = {
  factor?: number;
  percentChange: number;
  region: string;
  asAtDate?: string;
  indexDate: string;
  source?: string;
};

export type ComparableContext = {
  count: number;
  medianCapitalValue?: number;
  p25?: number;
  p75?: number;
  spread?: number;
};

export type PropertyContext = {
  bedrooms?: number;
  bathrooms?: number;
  landAreaSqm?: number;
  category: PropertyCategory;
  suburb?: string;
};

export type BuildingAttributes = {
  conditionCode?: string;
  viewCode?: string;
  viewScopeCode?: string;
  floorAreaSqm?: number;
  livingAreaSqm?: number;
  ageIndicator?: string;
  garageFreestanding?: number;
  garageUnderRoof?: number;
  bedrooms?: number;
  hasDeck?: string;
  offStreetParking?: number;
};

export type AdjustmentExplanation = {
  type:
    | "BASELINE"
    | "INDEX"
    | "INDEX_ADJUSTMENT"
    | "COMPARABLE"
    | "COMPARABLE_SPREAD"
    | "CHARACTERISTIC";
  description: string;
  impactLow: number;
  impactHigh: number;
};

export type ValuationEngineInput = {
  ratingValuation: RatingValuation;
  regionalIndex?: RegionalIndex;
  comparable?: ComparableContext;
  property?: PropertyContext;
  buildingAttributes?: BuildingAttributes;
};

export type ValuationResult = {
  rangeLow: number;
  rangeHigh: number;
  midpoint: number;
  confidence: ConfidenceLevel;
  explanations?: AdjustmentExplanation[];
  assumptions: string[];
  sources?: ValuationSource[];
  adjustments?: AdjustmentExplanation[];
  baseline?: {
    capitalValue: number;
    landValue?: number;
    improvementsValue?: number;
    valuationDate: string;
    source?: string;
  };
  dataFreshness?: {
    valuationDate: string;
    valuationAgeDays: number;
    indexDate?: string;
  };
};

// ── V2 Engine Types (DVR-based) ─────────────────────────────

export type DvrRecord = {
  unit_of_property_id: string;
  district_ta_code: number | null;
  situation_name: string | null;
  legal_description: string | null;
  land_area: number | null;
  property_category: string | null;
  current_effective_valuation_date: string | null;
  capital_value: number | null;
  land_value: number | null;
  improvements_value: number | null;
  no_of_bedrooms: number | null;
  off_street_parking: number | null;
  zoning: string | null;
  actual_property_use: string | null;
  building_total_floor_area: number | null;
  mass_total_living_area: number | null;
};

export type Comparable = {
  unit_of_property_id: string;
  capital_value: number | null;
  land_area: number | null;
  no_of_bedrooms: number | null;
  property_category: string | null;
  current_effective_valuation_date: string | null;
  score: number;
};

export type ValuationEstimate = {
  subject: { unit_of_property_id: string; address?: string };
  baseline: {
    capital_value: number | null;
    land_value: number | null;
    improvements_value: number | null;
  };
  estimate: {
    point: number | null;
    low: number | null;
    high: number | null;
    method: string;
  };
  comparables: {
    count: number;
    p25: number | null;
    p50: number | null;
    p75: number | null;
  };
  confidence: {
    level: "High" | "Medium" | "Low";
    score: number;
    reasons: string[];
  };
  suburb_median?: number | null;
  suburb_name?: string | null;
  debug?: unknown;
};