// ─────────────────────────────────────────────────────────────
// VendorHub — Property E-Valuation Engine
//
// Pure function.  No DB.  No HTTP.  No secrets.
// Input  -> ValuationEngineInput
// Output -> ValuationResult  (range, confidence, explanations)
// ─────────────────────────────────────────────────────────────

import type {
  ValuationEngineInput,
  ValuationResult,
  AdjustmentExplanation,
} from "./types";
import { ConfidenceLevel, PropertyCategory } from "./types";
import { scoreCharacteristics } from "./characteristicAdjustments";

// ── Tuning constants ──────────────────────────────────────
const BASELINE_SPREAD      = 0.10;   // +/-10% default half-width
const MAX_INDEX_ADJUSTMENT = 0.25;   // cap regional shift at +/-25%
const MS_PER_DAY           = 86_400_000;

// ── Utility helpers ───────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function daysSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / MS_PER_DAY);
}

function nzd(n: number): string {
  return `$${Math.abs(n).toLocaleString("en-NZ")}`;
}

// ── Confidence derivation ─────────────────────────────────

function deriveConfidence(
  category: PropertyCategory,
  ageDays: number,
  comparableCount?: number,
  hasAttributes?: boolean,
): ConfidenceLevel {
  const TWO_YEARS  = 730;
  const FOUR_YEARS = 1_461;

  // LOW — disqualifiers take priority
  if (ageDays > FOUR_YEARS) return ConfidenceLevel.LOW;
  if (
    category === PropertyCategory.APARTMENT ||
    category === PropertyCategory.RURAL ||
    category === PropertyCategory.UNKNOWN
  ) {
    return ConfidenceLevel.LOW;
  }

  // HIGH — all conditions must be met
  if (
    category === PropertyCategory.RESIDENTIAL &&
    ageDays < TWO_YEARS &&
    (comparableCount ?? 0) > 10
  ) {
    return ConfidenceLevel.HIGH;
  }

  // MEDIUM — everything else
  return ConfidenceLevel.MEDIUM;
}

// ── Main engine ───────────────────────────────────────────

export function estimateValueRange(
  input: ValuationEngineInput,
): ValuationResult {
  const {
    ratingValuation,
    regionalIndex,
    comparable,
    property,
    buildingAttributes,
  } = input;

  // ═══════════════════════════════════════════════════════
  //  GUARDRAIL — rating valuation is mandatory
  // ═══════════════════════════════════════════════════════
  if (
    !ratingValuation ||
    !ratingValuation.capitalValue ||
    ratingValuation.capitalValue <= 0
  ) {
    throw new Error(
      "A rating valuation with a positive Capital Value (CV) is required. " +
      "The engine cannot produce an estimate without a CV baseline.",
    );
  }

  const cv = ratingValuation.capitalValue;
  const adjustments: AdjustmentExplanation[] = [];
  const assumptions: string[] = [];

  // ═══════════════════════════════════════════════════════
  //  LAYER A — Baseline  (CV +/- 10%)
  // ═══════════════════════════════════════════════════════

  let low  = cv * (1 - BASELINE_SPREAD);
  let high = cv * (1 + BASELINE_SPREAD);

  adjustments.push({
    type: "BASELINE",
    description:
      `Capital Value of ${nzd(cv)} used as anchor with a default ` +
      `+/-${BASELINE_SPREAD * 100}% range.`,
    impactLow:  Math.round(low - cv),
    impactHigh: Math.round(high - cv),
  });

  assumptions.push(
    "The council rating valuation (CV) is used as the baseline anchor. " +
    "It reflects the property's assessed value at the rating date, " +
    "not necessarily today's market value.",
  );

  // ═══════════════════════════════════════════════════════
  //  LAYER B — Regional Index Adjustment  (optional)
  // ═══════════════════════════════════════════════════════

  if (regionalIndex) {
    const rawPct     = regionalIndex.percentChange / 100;
    const boundedPct = clamp(rawPct, -MAX_INDEX_ADJUSTMENT, MAX_INDEX_ADJUSTMENT);
    const wasCapped  = boundedPct !== rawPct;

    const prevLow  = low;
    const prevHigh = high;

    low  = low  * (1 + boundedPct);
    high = high * (1 + boundedPct);

    const sign = regionalIndex.percentChange >= 0 ? "+" : "";

    adjustments.push({
      type: "INDEX_ADJUSTMENT",
      description:
        `Regional index for ${regionalIndex.region}: ` +
        `${sign}${regionalIndex.percentChange}%` +
        (wasCapped
          ? ` (capped to +/-${MAX_INDEX_ADJUSTMENT * 100}%)`
          : "") +
        ` applied to both bounds.`,
      impactLow:  Math.round(low - prevLow),
      impactHigh: Math.round(high - prevHigh),
    });

    assumptions.push(
      `A regional house-price index (${regionalIndex.region}, ` +
      `as at ${regionalIndex.indexDate}) was used to shift the range. ` +
      `This is a broad regional average and may not reflect ` +
      `suburb-level price movements.`,
    );
  } else {
    assumptions.push(
      "No regional index was supplied. The range is based solely on " +
      "the CV with no market-movement adjustment.",
    );
  }

  // ═══════════════════════════════════════════════════════
  //  LAYER C — Comparable Spread  (optional)
  // ═══════════════════════════════════════════════════════

  if (comparable?.spread !== undefined && comparable.spread > 0) {
    const midpoint = (low + high) / 2;
    const prevLow  = low;
    const prevHigh = high;

    low  = midpoint * (1 - comparable.spread);
    high = midpoint * (1 + comparable.spread);

    adjustments.push({
      type: "COMPARABLE_SPREAD",
      description:
        `Comparable spread of +/-${(comparable.spread * 100).toFixed(1)}% ` +
        `derived from ${comparable.count} comparable sale(s). ` +
        `Range width adjusted; midpoint unchanged.`,
      impactLow:  Math.round(low - prevLow),
      impactHigh: Math.round(high - prevHigh),
    });

    assumptions.push(
      `The range width was calibrated using the spread of ` +
      `${comparable.count} comparable sale(s). Comparables are ` +
      `indicative only and may differ in condition, size, or aspect.`,
    );
  }

  // ═══════════════════════════════════════════════════════
  //  LAYER D — Property Characteristics  (optional)
  //
  //  Shifts the midpoint up or down based on building
  //  attributes (condition, view, floor area, age, garaging).
  //  The spread (distance from midpoint) is preserved.
  // ═══════════════════════════════════════════════════════

  const charResult = scoreCharacteristics(
    buildingAttributes,
    low,
    high,
  );

  if (charResult.netShiftPct !== 0) {
    const prevLow  = low;
    const prevHigh = high;
    const midpoint = (low + high) / 2;
    const halfSpread = (high - low) / 2;

    // Shift the midpoint, preserve the spread width
    const newMidpoint = midpoint * (1 + charResult.netShiftPct);
    low  = newMidpoint - halfSpread;
    high = newMidpoint + halfSpread;

    // Add individual characteristic adjustments for the waterfall
    adjustments.push(...charResult.adjustments);

    // Recalculate actual dollar impact after applying the net shift
    const summaryImpactLow  = Math.round(low - prevLow);
    const summaryImpactHigh = Math.round(high - prevHigh);

    adjustments.push({
      type: "CHARACTERISTIC",
      description:
        `Net characteristic shift: ` +
        `${charResult.netShiftPct >= 0 ? "+" : ""}` +
        `${(charResult.netShiftPct * 100).toFixed(1)}% applied to midpoint ` +
        `(low ${summaryImpactLow >= 0 ? "+" : ""}${nzd(summaryImpactLow)}, ` +
        `high ${summaryImpactHigh >= 0 ? "+" : ""}${nzd(summaryImpactHigh)}).`,
      impactLow: summaryImpactLow,
      impactHigh: summaryImpactHigh,
    });
  }

  if (charResult.assumption) {
    assumptions.push(charResult.assumption);
  }

  if (!buildingAttributes) {
    assumptions.push(
      "No building attribute data was available. The estimate is based " +
      "on CV and market index only, without property-specific adjustments.",
    );
  }

  // ═══════════════════════════════════════════════════════
  //  CONFIDENCE SCORING
  // ═══════════════════════════════════════════════════════

  const valuationAgeDays = daysSince(ratingValuation.valuationDate);

  const confidence = deriveConfidence(
    property.category,
    valuationAgeDays,
    comparable?.count,
    !!buildingAttributes,
  );

  // ═══════════════════════════════════════════════════════
  //  ASSEMBLE RESULT
  // ═══════════════════════════════════════════════════════

  const rangeLow  = Math.round(low);
  const rangeHigh = Math.round(high);

  if (rangeLow >= rangeHigh) {
    throw new Error(
      "Calculated range is degenerate (low >= high). " +
      "This usually means conflicting inputs - check CV and spread values.",
    );
  }

  assumptions.push(
    "This is an indicative estimate only - not a registered valuation. " +
    "It must not be relied upon for lending, insurance, or legal purposes.",
  );

  return {
    rangeLow,
    rangeHigh,
    midpoint: Math.round((rangeLow + rangeHigh) / 2),
    confidence,
    baseline: {
      capitalValue:  cv,
      valuationDate: ratingValuation.valuationDate,
      source:        ratingValuation.source,
    },
    adjustments,
    assumptions,
    dataFreshness: {
      valuationDate:    ratingValuation.valuationDate,
      valuationAgeDays,
      ...(regionalIndex ? { indexDate: regionalIndex.indexDate } : {}),
    },
  };
}