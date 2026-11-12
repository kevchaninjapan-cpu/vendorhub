import { supabaseAdmin } from "../supabase/admin";

const STREET_STOPWORDS = new Set([
  "road", "rd", "avenue", "ave", "street", "st",
  "lane", "ln", "place", "pl", "drive", "dr",
  "crescent", "cres", "court", "ct", "terrace", "tce",
  "close", "way", "rise", "park", "parade", "pde",
  "grove", "grv", "highway", "hwy",
]);

export function normaliseAddress(address: string): string {
  const cleaned = address
    .trim()
    .toLowerCase()
    .replace(/(\r\n|\r|\n)+/g, " ")
    .replace(/[,.]/g, "")
    .replace(/\s+/g, " ");

  const tokens = cleaned.split(" ").filter(Boolean);
  const filtered = tokens.filter((t) => !STREET_STOPWORDS.has(t));
  return filtered.join(" ");
}

export type AklRateRecord = {
  rate_account_key: string;
  rates_assessment_num: string | null;
  formatted_address: string | null;
  address_norm: string | null;
  valuation_ref: string | null;
  ct: string | null;
  legal: string | null;
  cv: number | null;
  lv: number | null;
  iv: number | null;
  valuation_date: string | null;
  latest_valuation_date: string | null;
  land_use_description: string | null;
  improvement: string | null;
  arealabel: string | null;
  rateability: string | null;
  gstflag: string | null;
  objectid: number | null;
};

/**
 * Extract suburb from formatted_address lines.
 * "24 Waimea Lane\rRemuera\rAuckland 1050" => "Remuera"
 */
export function suburbFromFormattedAddress(formatted: string | null): string | null {
  if (!formatted) return null;
  const parts = formatted
    .split(/\r\n|\r|\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length >= 2 ? parts[1] : null;
}

/**
 * Resolve an address to an Auckland Council rate assessment record.
 */
export async function getAklRecordByAddress(
  address: string,
): Promise<AklRateRecord | null> {
  const norm = normaliseAddress(address);

  // Exact match (uses idx_akl_address_norm)
  const { data: exact } = await supabaseAdmin
    .from("nz_akl_rate_assessment")
    .select("*")
    .eq("address_norm", norm)
    .maybeSingle();

  if (exact) return exact as AklRateRecord;

  // Fuzzy match (uses idx_akl_address_norm_trgm)
  const words = norm.split(" ").filter((w) => w.length >= 1);
  if (words.length === 0) return null;

  const pattern = "%" + words.join("%") + "%";

  const { data } = await supabaseAdmin
    .from("nz_akl_rate_assessment")
    .select("*")
    .ilike("address_norm", pattern)
    .not("cv", "is", null)
    .limit(1);

  return (data?.[0] as AklRateRecord) ?? null;
}

/**
 * Median CV for ALL properties in a suburb, calculated in the database.
 * Uses idx_akl_suburb, so it's an exact, indexed lookup.
 */
export async function getAklSuburbMedian(
  suburb: string | null,
): Promise<number | null> {
  if (!suburb) return null;

  const { data, error } = await supabaseAdmin.rpc("akl_suburb_median", {
    p_suburb: suburb,
  });

  if (error || data == null) return null;
  return Number(data);
}

/**
 * Find comparable Auckland properties.
 * Same suburb first (indexed via akl_comparables), then falls back to
 * same land use across Auckland if the suburb has too few matches.
 */
export async function findAklComparables(
  subject: AklRateRecord,
  limit = 250,
): Promise<AklRateRecord[]> {
  const suburb = suburbFromFormattedAddress(subject.formatted_address);

  const subjCv = subject.cv;
  const cvMin = subjCv ? Math.round(subjCv * 0.5) : null;
  const cvMax = subjCv ? Math.round(subjCv * 1.5) : null;

  // Same-suburb comparables (indexed)
  let suburbRows: AklRateRecord[] = [];
  if (suburb) {
    const { data, error } = await supabaseAdmin.rpc("akl_comparables", {
      p_exclude_key: subject.rate_account_key,
      p_suburb: suburb,
      p_land_use: subject.land_use_description,
      p_cv_min: cvMin,
      p_cv_max: cvMax,
      p_limit: limit,
    });
    if (error) throw new Error(`findAklComparables error: ${error.message}`);
    suburbRows = (data as AklRateRecord[]) ?? [];
  }

  if (suburbRows.length >= 10 || !subject.land_use_description) {
    return suburbRows;
  }

  // Fallback: relax suburb if too few results
  let fb = supabaseAdmin
    .from("nz_akl_rate_assessment")
    .select("*")
    .not("cv", "is", null)
    .neq("rate_account_key", subject.rate_account_key)
    .eq("land_use_description", subject.land_use_description)
    .limit(limit);

  if (cvMin && cvMax) fb = fb.gte("cv", cvMin).lte("cv", cvMax);

  const { data: fbData, error: fbErr } = await fb;
  if (fbErr) throw new Error(`findAklComparables fallback error: ${fbErr.message}`);

  return (fbData as AklRateRecord[]) ?? [];
}

/**
 * Search Auckland addresses for autocomplete.
 */
export async function searchAklAddresses(
  query: string,
  limit = 10,
): Promise<
  Array<{
    rate_account_key: string;
    formatted_address: string | null;
    cv: number | null;
  }>
> {
  const norm = normaliseAddress(query);
  const words = norm.split(" ").filter((w) => w.length >= 1);
  if (words.length === 0) return [];

  const pattern = "%" + words.join("%") + "%";

  const { data } = await supabaseAdmin
    .from("nz_akl_rate_assessment")
    .select("rate_account_key, formatted_address, cv")
    .ilike("address_norm", pattern)
    .not("cv", "is", null)
    .limit(limit);

  return data ?? [];
}