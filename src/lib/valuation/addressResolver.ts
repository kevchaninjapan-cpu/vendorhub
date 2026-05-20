import { supabaseAdmin } from "../supabase/admin";
import { getAklRecordByAddress, searchAklAddresses } from "./aucklandRepository";

const STREET_STOPWORDS = new Set([
  "road", "rd", "avenue", "ave", "street", "st",
  "lane", "ln", "place", "pl", "drive", "dr",
  "crescent", "cres", "court", "ct", "terrace", "tce",
  "close", "way", "rise", "park", "parade", "pde",
  "grove", "grv", "highway", "hwy",
]);

const AUCKLAND_HINTS = /auckland|akl|remuera|ellerslie|epsom|grey lynn|western springs|ponsonby|mt eden|mount eden|takapuna|devonport|herne bay|parnell|newmarket|onehunga|mt albert|mount albert|sandringham|mt roskill|mount roskill|otahuhu|papakura|manukau|botany|howick|pakuranga|glen innes|glendowie|st heliers|mission bay|orakei|kohimarama/i;

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

export type ResolveResult = {
  unitId: string | null;
  aklKey: string | null;
  matchType:
    | "exact"
    | "fuzzy"
    | "auckland_exact"
    | "auckland_fuzzy"
    | "no_match";
};

/**
 * Resolve address → LINZ unit_of_property_id OR Auckland rate_account_key
 */
export async function resolveUnitIdFromAddress(
  address: string,
): Promise<ResolveResult> {
  const norm = normaliseAddress(address);

  // ── If Auckland address, try Auckland first ───────────────
  if (AUCKLAND_HINTS.test(address)) {
    const akl = await getAklRecordByAddress(address);
    if (akl) {
      return {
        unitId: null,
        aklKey: akl.rate_account_key,
        matchType: akl.address_norm === norm ? "auckland_exact" : "auckland_fuzzy",
      };
    }
  }

  // ── 1. Exact match in DVR address map ─────────────────────
  const { data: exact } = await supabaseAdmin
    .from("nz_address_property_map")
    .select("unit_of_property_id")
    .eq("address_norm", norm)
    .maybeSingle();

  if (exact?.unit_of_property_id) {
    return { unitId: exact.unit_of_property_id, aklKey: null, matchType: "exact" };
  }

  // ── 2. Fuzzy match on DVR situation_name ──────────────────
  const words = norm.split(" ").filter((w) => w.length > 1);
  if (words.length >= 2) {
    const pattern = "%" + words.join("%") + "%";
    const { data: fuzzy } = await supabaseAdmin
      .from("nz_dvr_114085")
      .select("unit_of_property_id")
      .ilike("situation_name", pattern)
      .not("capital_value", "is", null)
      .limit(1);

    if (fuzzy && fuzzy.length > 0) {
      return { unitId: fuzzy[0].unit_of_property_id, aklKey: null, matchType: "fuzzy" };
    }
  }

  // ── 3. Auckland Council fallback (any address) ────────────
  const akl = await getAklRecordByAddress(address);
  if (akl) {
    return {
      unitId: null,
      aklKey: akl.rate_account_key,
      matchType: akl.address_norm === norm ? "auckland_exact" : "auckland_fuzzy",
    };
  }

  return { unitId: null, aklKey: null, matchType: "no_match" };
}

/**
 * Search addresses for autocomplete — Auckland-first if hint detected.
 */
export async function searchAddresses(
  query: string,
  limit = 10,
): Promise<
  Array<{
    unit_of_property_id: string | null;
    akl_key: string | null;
    situation_name: string;
    capital_value: number | null;
    source: string;
  }>
> {
  const norm = normaliseAddress(query);
  const words = norm.split(" ").filter((w) => w.length > 1);
  if (words.length < 1) return [];

  const pattern = "%" + words.join("%") + "%";
  const isAucklandQuery = AUCKLAND_HINTS.test(query);

  // ── Auckland first if hinted ──────────────────────────────
  if (isAucklandQuery) {
    const aklResults = await searchAklAddresses(query, limit);
    if (aklResults.length > 0) {
      return aklResults.map((r) => ({
        unit_of_property_id: null,
        akl_key: r.rate_account_key,
        situation_name: r.formatted_address ?? "",
        capital_value: r.cv,
        source: "AUCKLAND_COUNCIL",
      }));
    }
  }

  // ── DVR search ────────────────────────────────────────────
  const { data: dvrResults } = await supabaseAdmin
    .from("nz_dvr_114085")
    .select("unit_of_property_id, situation_name, capital_value")
    .ilike("situation_name", pattern)
    .not("capital_value", "is", null)
    .limit(limit);

  const results = (dvrResults ?? []).map((r) => ({
    unit_of_property_id: r.unit_of_property_id,
    akl_key: null as string | null,
    situation_name: r.situation_name,
    capital_value: r.capital_value,
    source: "LINZ_DVR",
  }));

  // ── Fallback to Auckland if DVR returned nothing ──────────
  if (results.length === 0) {
    const aklResults = await searchAklAddresses(query, limit);
    for (const r of aklResults) {
      results.push({
        unit_of_property_id: null,
        akl_key: r.rate_account_key,
        situation_name: r.formatted_address ?? "",
        capital_value: r.cv,
        source: "AUCKLAND_COUNCIL",
      });
    }
  }

  return results;
}