// ─────────────────────────────────────────────────────────────
// VendorHub — Layer D: Property Characteristic Adjustments
//
// Uses LINZ DVR building attributes to shift the valuation
// midpoint up or down based on property-specific qualities.
//
// Design principles:
//  - Each factor is small (max +/-3%)
//  - Total shift is capped at +/-7.5%
//  - Missing data = no adjustment (never penalised)
//  - Every adjustment is explained in plain English
// ─────────────────────────────────────────────────────────────

import type { BuildingAttributes, AdjustmentExplanation } from "./types";

// ── Tuning constants ──────────────────────────────────────

/** Maximum total shift from all characteristics combined */
const MAX_TOTAL_SHIFT_PCT = 0.075; // +/-7.5%

// ── Individual scorer types ───────────────────────────────

interface CharacteristicScore {
  pct: number;           // signed percentage shift, e.g. +0.03 = +3%
  description: string;   // human-readable explanation
}

// ── Building Condition ────────────────────────────────────
//    Max impact: +/-3%
//
//    LINZ codes (LINZS30300):
//      VP = Very Poor, P = Poor, PA = Poor-Average,
//      AA = Average, GA/AG = Good-Average,
//      G = Good, VG = Very Good, E = Excellent

const CONDITION_MAP: Record<string, { pct: number; label: string }> = {
  VP:  { pct: -0.030, label: "Very Poor" },
  P:   { pct: -0.020, label: "Poor" },
  PA:  { pct: -0.010, label: "Poor-Average" },
  AA:  { pct:  0.000, label: "Average" },
  A:   { pct:  0.000, label: "Average" },
  AG:  { pct:  0.010, label: "Good-Average" },
  GA:  { pct:  0.010, label: "Good-Average" },
  G:   { pct:  0.020, label: "Good" },
  GG:  { pct:  0.025, label: "Good" },
  VG:  { pct:  0.030, label: "Very Good" },
  E:   { pct:  0.030, label: "Excellent" },
};

function scoreCondition(attrs: BuildingAttributes): CharacteristicScore | null {
  if (!attrs.conditionCode) return null;

  const code = attrs.conditionCode.trim().toUpperCase();
  const entry = CONDITION_MAP[code];

  if (!entry || entry.pct === 0) return null;

  return {
    pct: entry.pct,
    description:
      `Building condition rated "${entry.label}" (${code}) - ` +
      `${entry.pct > 0 ? "+" : ""}${(entry.pct * 100).toFixed(1)}% adjustment.`,
  };
}

// ── View Quality ──────────────────────────────────────────
//    Max impact: +2%
//
//    Combines mass_view and mass_scope_of_view.
//    Only positive adjustments — ordinary/no view is neutral.
//
//    View codes: N=None, O=Ordinary, G=Good, VG=Very Good, E=Excellent
//    Scope codes: N=Narrow/None, M=Moderate, W=Wide

function scoreView(attrs: BuildingAttributes): CharacteristicScore | null {
  if (!attrs.viewCode) return null;

  const view = attrs.viewCode.trim().toUpperCase();
  const scope = (attrs.viewScopeCode ?? "").trim().toUpperCase();

  // No adjustment for ordinary or no view
  if (view === "N" || view === "O") return null;

  let pct = 0;
  let viewLabel = "";

  if (view === "G") {
    viewLabel = "Good";
    pct = scope === "W" ? 0.012 : 0.008;
  } else if (view === "VG") {
    viewLabel = "Very Good";
    pct = scope === "W" ? 0.018 : 0.012;
  } else if (view === "E") {
    viewLabel = "Excellent";
    pct = scope === "W" ? 0.020 : 0.015;
  }

  if (pct === 0) return null;

  const scopeLabel = scope === "W" ? "wide" : scope === "M" ? "moderate" : "narrow";

  return {
    pct,
    description:
      `${viewLabel} view with ${scopeLabel} scope - ` +
      `+${(pct * 100).toFixed(1)}% adjustment.`,
  };
}

// ── Floor Area ────────────────────────────────────────────
//    Max impact: +/-2%
//
//    Compares total floor area to a NZ residential norm of
//    ~150m2. Adjusts +/-1% per 50m2 deviation, capped.

const FLOOR_AREA_NORM_SQM = 150;
const FLOOR_AREA_STEP_SQM = 50;
const FLOOR_AREA_STEP_PCT = 0.01;
const FLOOR_AREA_MAX_PCT  = 0.02;

function scoreFloorArea(attrs: BuildingAttributes): CharacteristicScore | null {
  // Prefer total floor area, fall back to living area
  const area = attrs.floorAreaSqm ?? attrs.livingAreaSqm;
  if (!area || area <= 0) return null;

  const deviation = area - FLOOR_AREA_NORM_SQM;

  // Don't adjust for small deviations (within +/-25m2)
  if (Math.abs(deviation) < 25) return null;

  const steps = deviation / FLOOR_AREA_STEP_SQM;
  const rawPct = steps * FLOOR_AREA_STEP_PCT;
  const pct = Math.max(-FLOOR_AREA_MAX_PCT, Math.min(FLOOR_AREA_MAX_PCT, rawPct));

  const direction = pct > 0 ? "above" : "below";
  const sign = pct > 0 ? "+" : "";

  return {
    pct,
    description:
      `Floor area of ${area}m2 is ${Math.abs(Math.round(deviation))}m2 ${direction} ` +
      `the ${FLOOR_AREA_NORM_SQM}m2 residential norm - ` +
      `${sign}${(pct * 100).toFixed(1)}% adjustment.`,
  };
}

// ── Building Age ──────────────────────────────────────────
//    Max impact: +/-1.5%
//
//    LINZ age indicator is a decade string: "198" = 1980s,
//    "200" = 2000s, "196" = 1960s, etc.

const AGE_MAP: Record<string, { pct: number; label: string }> = {
  "192": { pct: -0.015, label: "1920s" },
  "193": { pct: -0.015, label: "1930s" },
  "194": { pct: -0.015, label: "1940s" },
  "195": { pct: -0.015, label: "1950s" },
  "196": { pct: -0.010, label: "1960s" },
  "197": { pct: -0.008, label: "1970s" },
  "198": { pct:  0.000, label: "1980s" },
  "199": { pct:  0.000, label: "1990s" },
  "200": { pct:  0.008, label: "2000s" },
  "201": { pct:  0.012, label: "2010s" },
  "202": { pct:  0.015, label: "2020s" },
};

function scoreAge(attrs: BuildingAttributes): CharacteristicScore | null {
  if (!attrs.ageIndicator) return null;

  const code = attrs.ageIndicator.trim().slice(0, 3); // first 3 chars
  const entry = AGE_MAP[code];

  if (!entry || entry.pct === 0) return null;

  const sign = entry.pct > 0 ? "+" : "";

  return {
    pct: entry.pct,
    description:
      `Building era: ${entry.label} - ` +
      `${sign}${(entry.pct * 100).toFixed(1)}% adjustment.`,
  };
}

// ── Garaging ──────────────────────────────────────────────
//    Max impact: +/-1%
//
//    0 garages in a residential context = slight negative.
//    2+ garages = slight positive.

function scoreGaraging(attrs: BuildingAttributes): CharacteristicScore | null {
  const total =
    (attrs.garageFreestanding ?? 0) + (attrs.garageUnderRoof ?? 0);

  // Only adjust if we know the data exists (at least one field defined)
  if (
    attrs.garageFreestanding === undefined &&
    attrs.garageUnderRoof === undefined
  ) {
    return null;
  }

  if (total === 0) {
    return {
      pct: -0.01,
      description: "No garaging detected - -1.0% adjustment.",
    };
  }

  if (total >= 2) {
    return {
      pct: 0.01,
      description: `${total} garage spaces - +1.0% adjustment.`,
    };
  }

  // 1 garage = neutral, no adjustment
  return null;
}

// ── Orchestrator ──────────────────────────────────────────

export interface CharacteristicResult {
  /** Net percentage shift (signed), capped at +/-MAX_TOTAL_SHIFT_PCT */
  netShiftPct: number;
  /** Individual adjustment explanations */
  adjustments: AdjustmentExplanation[];
  /** Assumption text for the UI */
  assumption: string | null;
}

/**
 * Score all building characteristics and return a net
 * percentage shift to apply to the valuation midpoint.
 *
 * @param attrs - Building attributes from LINZ DVR
 * @param currentLow - Current range low bound (for dollar impact calc)
 * @param currentHigh - Current range high bound
 * @returns CharacteristicResult with net shift + explanations
 */
export function scoreCharacteristics(
  attrs: BuildingAttributes | undefined,
  currentLow: number,
  currentHigh: number,
): CharacteristicResult {
  // No attributes → no adjustment
  if (!attrs) {
    return { netShiftPct: 0, adjustments: [], assumption: null };
  }

  // ── Run all scorers ────────────────────────────────────
  const scores: CharacteristicScore[] = [];

  const condition = scoreCondition(attrs);
  if (condition) scores.push(condition);

  const view = scoreView(attrs);
  if (view) scores.push(view);

  const floorArea = scoreFloorArea(attrs);
  if (floorArea) scores.push(floorArea);

  const age = scoreAge(attrs);
  if (age) scores.push(age);

  const garaging = scoreGaraging(attrs);
  if (garaging) scores.push(garaging);

  // ── No adjustments triggered ───────────────────────────
  if (scores.length === 0) {
    return {
      netShiftPct: 0,
      adjustments: [],
      assumption:
        "Building attributes were available but all scored neutral " +
        "(average condition, standard size, etc.) - no characteristic adjustment applied.",
    };
  }

  // ── Sum and cap ────────────────────────────────────────
  const rawSum = scores.reduce((sum, s) => sum + s.pct, 0);
  const capped = Math.max(
    -MAX_TOTAL_SHIFT_PCT,
    Math.min(MAX_TOTAL_SHIFT_PCT, rawSum),
  );
  const wasCapped = capped !== rawSum;

  // ── Calculate dollar impacts ───────────────────────────
  //    Shift is applied to both bounds equally (moves midpoint)
  const midpoint = (currentLow + currentHigh) / 2;
  const dollarShift = Math.round(midpoint * capped);

  // ── Build adjustment explanations ──────────────────────
  const adjustments: AdjustmentExplanation[] = scores.map((s) => ({
    type: "CHARACTERISTIC" as const,
    description: s.description,
    impactLow: Math.round(currentLow * s.pct),
    impactHigh: Math.round(currentHigh * s.pct),
  }));

  // ── Build assumption text ──────────────────────────────
  const sign = capped >= 0 ? "+" : "";
  let assumption =
    `${scores.length} building characteristic(s) contributed a net ` +
    `${sign}${(capped * 100).toFixed(1)}% shift to the range midpoint` +
    ` (${sign}$${Math.abs(dollarShift).toLocaleString("en-NZ")}).`;

  if (wasCapped) {
    assumption +=
      ` The raw total of ${sign}${(rawSum * 100).toFixed(1)}% was capped ` +
      `at +/-${(MAX_TOTAL_SHIFT_PCT * 100).toFixed(1)}%.`;
  }

  return {
    netShiftPct: capped,
    adjustments,
    assumption,
  };
}