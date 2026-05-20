import type { ValuationEstimate, DvrRecord, Comparable } from "./types";
import { getDvrByUnitId, resolveAddress, findComparableCandidates } from "./repository";
import {
  getAklRecordByAddress,
  findAklComparables,
  getAklSuburbMedian,
  suburbFromFormattedAddress,
  type AklRateRecord,
} from "./aucklandRepository";
import { similarityScore, yearsSince } from "./scoring";
import { quantile } from "./stats";

type EstimateArgs = {
  unit_of_property_id?: string;
  akl_key?: string;
  address?: string;
  options?: {
    include_comps?: boolean;
    include_debug?: boolean;
    comps_limit?: number;
  };
};

export async function estimateValue(args: EstimateArgs): Promise<ValuationEstimate> {
  const includeComps = args.options?.include_comps ?? true;
  const includeDebug = args.options?.include_debug ?? false;
  const compsLimit = args.options?.comps_limit ?? 50;

  let unitId = args.unit_of_property_id ?? null;
  let aklKey = args.akl_key ?? null;
  let matchType = "direct";

  if (!unitId && !aklKey && args.address) {
    const resolved = await resolveAddress(args.address);
    unitId = resolved.unitId;
    aklKey = resolved.aklKey;
    matchType = resolved.matchType;
  }

  if (aklKey || (!unitId && matchType.startsWith("auckland"))) {
    return estimateAuckland(aklKey, args.address, includeComps, includeDebug, compsLimit, matchType);
  }

  if (!unitId) {
    return {
      subject: { unit_of_property_id: "", address: args.address },
      baseline: { capital_value: null, land_value: null, improvements_value: null },
      estimate: { point: null, low: null, high: null, method: "unresolved_subject" },
      comparables: { count: 0, p25: null, p50: null, p75: null },
      confidence: {
        level: "Low",
        score: 0.1,
        reasons: ["Could not resolve address to a property. Try a more specific address."],
      },
      debug: includeDebug ? { matchType } : undefined,
    };
  }

  const subject = await getDvrByUnitId(unitId);
  if (!subject) {
    return {
      subject: { unit_of_property_id: unitId, address: args.address },
      baseline: { capital_value: null, land_value: null, improvements_value: null },
      estimate: { point: null, low: null, high: null, method: "missing_dvr_record" },
      comparables: { count: 0, p25: null, p50: null, p75: null },
      confidence: { level: "Low", score: 0.15, reasons: ["No DVR record found."] },
      debug: includeDebug ? { unitId, matchType } : undefined,
    };
  }

  return estimateDvr(subject, args.address, includeComps, includeDebug, compsLimit, matchType);
}

// ── LINZ DVR estimate ───────────────────────────────────────

async function estimateDvr(
  subject: DvrRecord,
  address: string | undefined,
  includeComps: boolean,
  includeDebug: boolean,
  compsLimit: number,
  matchType: string,
): Promise<ValuationEstimate> {
  const baseline = {
    capital_value: subject.capital_value ?? null,
    land_value: subject.land_value ?? null,
    improvements_value: subject.improvements_value ?? null,
  };

  let point = baseline.capital_value;
  let low: number | null = null;
  let high: number | null = null;
  let method = "baseline_capital_value";

  let compsSummary = { count: 0, p25: null as number | null, p50: null as number | null, p75: null as number | null };
  const debug: Record<string, unknown> = includeDebug
    ? { unitId: subject.unit_of_property_id, matchType, source: "LINZ_DVR", subject }
    : {};

  if (includeComps && baseline.capital_value != null) {
    const candidates = await findComparableCandidates(subject, 250);

    const scored: Comparable[] = candidates
      .filter((c) => c.unit_of_property_id !== subject.unit_of_property_id)
      .map((c: DvrRecord) => ({
        unit_of_property_id: c.unit_of_property_id,
        capital_value: c.capital_value ?? null,
        land_area: c.land_area ?? null,
        no_of_bedrooms: c.no_of_bedrooms ?? null,
        property_category: c.property_category ?? null,
        current_effective_valuation_date: c.current_effective_valuation_date ?? null,
        score: similarityScore(subject, c),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, compsLimit);

    const values = scored
      .map((s) => s.capital_value)
      .filter((v): v is number => typeof v === "number")
      .sort((a, b) => a - b);

    compsSummary = {
      count: values.length,
      p25: quantile(values, 0.25),
      p50: quantile(values, 0.5),
      p75: quantile(values, 0.75),
    };

    if (values.length >= 10) {
      point = compsSummary.p50;
      low = compsSummary.p25;
      high = compsSummary.p75;
      method = "comps_quartiles_same_ta_category";
    } else if (values.length >= 3) {
      point = compsSummary.p50;
      low = values[Math.floor(values.length * 0.2)] ?? values[0];
      high = values[Math.ceil(values.length * 0.8) - 1] ?? values[values.length - 1];
      method = "comps_small_sample_band";
    } else {
      low = Math.round(baseline.capital_value * 0.9);
      high = Math.round(baseline.capital_value * 1.1);
      method = "baseline_with_default_band";
    }

    if (includeDebug) debug.comps = scored;
  } else if (baseline.capital_value != null) {
    low = Math.round(baseline.capital_value * 0.9);
    high = Math.round(baseline.capital_value * 1.1);
    method = "baseline_with_default_band";
  }

  const confidence = computeConfidenceDvr(subject, compsSummary.count);

  return {
    subject: { unit_of_property_id: subject.unit_of_property_id, address },
    baseline,
    estimate: { point, low, high, method },
    comparables: compsSummary,
    confidence,
    suburb_median: null,
    suburb_name: null,
    debug: includeDebug ? debug : undefined,
  };
}

// ── Auckland Council estimate ───────────────────────────────

async function estimateAuckland(
  aklKey: string | null,
  address: string | undefined,
  includeComps: boolean,
  includeDebug: boolean,
  compsLimit: number,
  matchType: string,
): Promise<ValuationEstimate> {
  let record: AklRateRecord | null = null;

  if (aklKey) {
    const { supabaseAdmin } = await import("../supabase/admin");
    const { data } = await supabaseAdmin
      .from("nz_akl_rate_assessment")
      .select("*")
      .eq("rate_account_key", aklKey)
      .maybeSingle();
    record = data as AklRateRecord | null;
  }

  if (!record && address) {
    record = await getAklRecordByAddress(address);
  }

  if (!record) {
    return {
      subject: { unit_of_property_id: aklKey ?? "", address },
      baseline: { capital_value: null, land_value: null, improvements_value: null },
      estimate: { point: null, low: null, high: null, method: "auckland_no_record" },
      comparables: { count: 0, p25: null, p50: null, p75: null },
      confidence: { level: "Low", score: 0.1, reasons: ["Could not find Auckland property record."] },
      suburb_median: null,
      suburb_name: null,
      debug: includeDebug ? { aklKey, matchType, source: "AUCKLAND_COUNCIL" } : undefined,
    };
  }

  const baseline = {
    capital_value: record.cv ?? null,
    land_value: record.lv ?? null,
    improvements_value: record.iv ?? null,
  };

  let point = baseline.capital_value;
  let low: number | null = null;
  let high: number | null = null;
  let method = "auckland_baseline_cv";

  let compsSummary = { count: 0, p25: null as number | null, p50: null as number | null, p75: null as number | null };
  const debug: Record<string, unknown> = includeDebug
    ? { aklKey: record.rate_account_key, matchType, source: "AUCKLAND_COUNCIL", record }
    : {};

  if (includeComps && baseline.capital_value != null) {
    const candidates = await findAklComparables(record, 250);

    const scored = candidates
      .map((c) => {
        const cvRatio = c.cv && record!.cv ? c.cv / record!.cv : 0;
        const closeness = 1 - Math.min(Math.abs(Math.log(cvRatio || 1)), 1);
        return { ...c, score: Math.max(0, Math.min(1, closeness)) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, compsLimit);

    const values = scored
      .map((s) => s.cv)
      .filter((v): v is number => typeof v === "number" && v > 0)
      .sort((a, b) => a - b);

    compsSummary = {
      count: values.length,
      p25: quantile(values, 0.25),
      p50: quantile(values, 0.5),
      p75: quantile(values, 0.75),
    };

    if (values.length >= 10) {
      point = compsSummary.p50;
      low = compsSummary.p25;
      high = compsSummary.p75;
      method = "auckland_comps_quartiles";
    } else if (values.length >= 3) {
      point = compsSummary.p50;
      low = values[Math.floor(values.length * 0.2)] ?? values[0];
      high = values[Math.ceil(values.length * 0.8) - 1] ?? values[values.length - 1];
      method = "auckland_comps_small_sample";
    } else {
      low = Math.round(baseline.capital_value * 0.9);
      high = Math.round(baseline.capital_value * 1.1);
      method = "auckland_baseline_with_default_band";
    }

    if (includeDebug) debug.comps = scored.slice(0, 10);
  } else if (baseline.capital_value != null) {
    low = Math.round(baseline.capital_value * 0.9);
    high = Math.round(baseline.capital_value * 1.1);
    method = "auckland_baseline_with_default_band";
  }

  // ── Get TRUE suburb-wide median ──────────────────────────
  const suburbName = suburbFromFormattedAddress(record.formatted_address);
  const suburbMedian = suburbName ? await getAklSuburbMedian(suburbName) : null;

  const confidence = computeConfidenceAkl(record, compsSummary.count);

  return {
    subject: {
      unit_of_property_id: record.rate_account_key,
      address: record.formatted_address ?? address,
    },
    baseline,
    estimate: { point, low, high, method },
    comparables: compsSummary,
    confidence,
    suburb_median: suburbMedian,
    suburb_name: suburbName,
    debug: includeDebug ? debug : undefined,
  };
}

// ── Confidence scoring ──────────────────────────────────────

function computeConfidenceDvr(subject: DvrRecord, compsCount: number) {
  const reasons: string[] = [];
  let score = 0;

  if (subject.capital_value != null) score += 0.3;
  else reasons.push("Missing capital_value.");

  const ys = yearsSince(subject.current_effective_valuation_date);
  if (ys == null) { score += 0.05; reasons.push("Missing valuation date."); }
  else if (ys <= 2) score += 0.25;
  else if (ys <= 4) { score += 0.18; reasons.push("Valuation date is 2-4 years old."); }
  else { score += 0.1; reasons.push("Valuation date is >4 years old."); }

  const attrs = [
    subject.land_area != null,
    subject.no_of_bedrooms != null,
    subject.property_category != null,
    subject.zoning != null,
    subject.building_total_floor_area != null || subject.mass_total_living_area != null,
  ].filter(Boolean).length;
  score += (attrs / 5) * 0.15;
  if (attrs <= 2) reasons.push("Limited property attributes.");

  if (compsCount >= 25) score += 0.25;
  else if (compsCount >= 10) score += 0.18;
  else if (compsCount >= 3) { score += 0.1; reasons.push("Small comparable set."); }
  else { score += 0.05; reasons.push("Very few comparables found."); }

  let level: "High" | "Medium" | "Low" = "Low";
  if (score >= 0.75) level = "High";
  else if (score >= 0.45) level = "Medium";
  if (!reasons.length) reasons.push("Strong data coverage and comparable density.");

  return { level, score: Math.round(score * 100) / 100, reasons };
}

function computeConfidenceAkl(record: AklRateRecord, compsCount: number) {
  const reasons: string[] = [];
  let score = 0;

  if (record.cv != null) score += 0.3;
  else reasons.push("Missing CV.");

  if (record.latest_valuation_date) {
    const ys = yearsSince(record.latest_valuation_date);
    if (ys != null && ys <= 2) score += 0.25;
    else if (ys != null && ys <= 4) { score += 0.18; reasons.push("Valuation date is 2-4 years old."); }
    else { score += 0.1; reasons.push("Valuation date is >4 years old."); }
  } else {
    score += 0.05;
    reasons.push("Missing valuation date.");
  }

  const attrs = [
    record.lv != null,
    record.iv != null,
    record.land_use_description != null,
    record.arealabel != null,
    record.improvement != null,
  ].filter(Boolean).length;
  score += (attrs / 5) * 0.15;
  if (attrs <= 2) reasons.push("Limited property attributes from Auckland Council.");

  if (compsCount >= 25) score += 0.25;
  else if (compsCount >= 10) score += 0.18;
  else if (compsCount >= 3) { score += 0.1; reasons.push("Small comparable set."); }
  else { score += 0.05; reasons.push("Very few comparables found."); }

  let level: "High" | "Medium" | "Low" = "Low";
  if (score >= 0.75) level = "High";
  else if (score >= 0.45) level = "Medium";
  if (!reasons.length) reasons.push("Strong data coverage. Source: Auckland Council Rating Database.");

  reasons.push("Data source: LINZ regional database and Auckland Council public rating assessment.");

  return { level, score: Math.round(score * 100) / 100, reasons };
}