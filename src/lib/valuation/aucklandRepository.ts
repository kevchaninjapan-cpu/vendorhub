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

  // Exact match
  const { data: exact } = await supabaseAdmin
    .from("nz_akl_rate_assessment")
    .select("*")
    .eq("address_norm", norm)
    .maybeSingle();

  if (exact) return exact as AklRateRecord;

  // Fuzzy match
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
 * Get median CV for ALL properties in a suburb
 * (broader context than comparable properties).
 */
export async function getAklSuburbMedian(
  suburb: string | null,
): Promise<number | null> {
  if (!suburb) return null;

  const { data } = await supabaseAdmin
    .from("nz_akl_rate_assessment")
    .select("cv")
    .ilike("formatted_address", `%\r${suburb}\r%`)
    .not("cv", "is", null)
    .limit(2000);

  if (!data || data.length === 0) return null;

  const values = data
    .map((d) => d.cv as number)
    .filter((v) => v > 0)
    .sort((a, b) => a - b);

  if (values.length === 0) return null;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 === 0
    ? Math.round((values[mid - 1] + values[mid]) / 2)
    : values[mid];
}

/**
 * Find comparable Auckland properties.
 */
export async function findAklComparables(
  subject: AklRateRecord,
  limit = 250,
): Promise<AklRateRecord[]> {
  const suburb = suburbFromFormattedAddress(subject.formatted_address);

  const subjCv = subject.cv;
  const cvMin = subjCv ? Math.round(subjCv * 0.5) : null;
  const cvMax = subjCv ? Math.round(subjCv * 1.5) : null;

  let q = supabaseAdmin
    .from("nz_akl_rate_assessment")
    .select("*")
    .not("cv", "is", null)
    .neq("rate_account_key", subject.rate_account_key)
    .limit(limit);

  if (subject.land_use_description) {
    q = q.eq("land_use_description", subject.land_use_description);
  }

  if (suburb) {
    q = q.ilike("formatted_address", `%\r${suburb}\r%`);
  }

  if (cvMin && cvMax) {
    q = q.gte("cv", cvMin).lte("cv", cvMax);
  }

  const { data, error } = await q;
  if (error) throw new Error(`findAklComparables error: ${error.message}`);

  // Fallback: relax suburb if too few results
  if ((data?.length ?? 0) < 10 && subject.land_use_description) {
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

  return (data as AklRateRecord[]) ?? [];
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