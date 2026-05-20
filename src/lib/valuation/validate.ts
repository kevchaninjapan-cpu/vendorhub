// ─────────────────────────────────────────────────────────────
// VendorHub — Valuation Engine: Runtime Input Validation
//
// Validates raw JSON → ValuationEngineInput.
// Returns a discriminated union so the caller can branch
// cleanly on success/failure without try-catch.
// ─────────────────────────────────────────────────────────────

import type { ValuationEngineInput } from "./types";
import { PropertyCategory } from "./types";

// ── Discriminated result type ─────────────────────────────

type ValidationOk = {
  ok: true;
  data: ValuationEngineInput;
};

type ValidationErr = {
  ok: false;
  errors: string[];
};

export type ValidationResult = ValidationOk | ValidationErr;

// ── Helpers ───────────────────────────────────────────────

const VALID_SOURCES = ["LINZ_DVR", "COUNCIL_CV", "MANUAL"] as const;
const VALID_CATEGORIES = Object.values(PropertyCategory);

/** ISO-8601 date string (YYYY-MM-DD) */
function isIsoDate(val: unknown): val is string {
  if (typeof val !== "string") return false;
  const d = new Date(val);
  return !isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(val);
}

function isPositiveNumber(val: unknown): val is number {
  return typeof val === "number" && isFinite(val) && val > 0;
}

// ── Main validator ────────────────────────────────────────

export function validateValuationInput(raw: unknown): ValidationResult {
  const errors: string[] = [];

  // ── Top-level shape ──────────────────────────────────
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, errors: ["Request body must be a JSON object."] };
  }

  const body = raw as Record<string, unknown>;

  // ── ratingValuation (required) ───────────────────────
  if (!body.ratingValuation || typeof body.ratingValuation !== "object") {
    errors.push("ratingValuation is required and must be an object.");
  } else {
    const rv = body.ratingValuation as Record<string, unknown>;

    if (!isPositiveNumber(rv.capitalValue)) {
      errors.push("ratingValuation.capitalValue must be a positive number.");
    }
    if (!isIsoDate(rv.valuationDate)) {
      errors.push(
        "ratingValuation.valuationDate must be a valid ISO-8601 date (YYYY-MM-DD).",
      );
    }
    if (!VALID_SOURCES.includes(rv.source as (typeof VALID_SOURCES)[number])) {
      errors.push(
        `ratingValuation.source must be one of: ${VALID_SOURCES.join(", ")}.`,
      );
    }

    // Optional numeric fields — validate only if present
    if (rv.landValue !== undefined && !isPositiveNumber(rv.landValue)) {
      errors.push("ratingValuation.landValue must be a positive number if supplied.");
    }
    if (rv.improvementValue !== undefined && !isPositiveNumber(rv.improvementValue)) {
      errors.push(
        "ratingValuation.improvementValue must be a positive number if supplied.",
      );
    }
  }

  // ── property (required) ──────────────────────────────
  if (!body.property || typeof body.property !== "object") {
    errors.push("property is required and must be an object.");
  } else {
    const p = body.property as Record<string, unknown>;

    if (!VALID_CATEGORIES.includes(p.category as PropertyCategory)) {
      errors.push(
        `property.category must be one of: ${VALID_CATEGORIES.join(", ")}.`,
      );
    }
    if (p.landAreaSqm !== undefined && !isPositiveNumber(p.landAreaSqm)) {
      errors.push("property.landAreaSqm must be a positive number if supplied.");
    }
  }

  // ── regionalIndex (optional) ─────────────────────────
  if (body.regionalIndex !== undefined) {
    if (typeof body.regionalIndex !== "object" || body.regionalIndex === null) {
      errors.push("regionalIndex must be an object if supplied.");
    } else {
      const ri = body.regionalIndex as Record<string, unknown>;

      if (typeof ri.region !== "string" || ri.region.trim().length === 0) {
        errors.push("regionalIndex.region must be a non-empty string.");
      }
      if (typeof ri.percentChange !== "number" || !isFinite(ri.percentChange as number)) {
        errors.push("regionalIndex.percentChange must be a finite number.");
      }
      if (!isIsoDate(ri.indexDate)) {
        errors.push(
          "regionalIndex.indexDate must be a valid ISO-8601 date (YYYY-MM-DD).",
        );
      }
    }
  }

  // ── comparable (optional) ────────────────────────────
  if (body.comparable !== undefined) {
    if (typeof body.comparable !== "object" || body.comparable === null) {
      errors.push("comparable must be an object if supplied.");
    } else {
      const c = body.comparable as Record<string, unknown>;

      if (typeof c.count !== "number" || !Number.isInteger(c.count) || (c.count as number) < 0) {
        errors.push("comparable.count must be a non-negative integer.");
      }
      if (c.spread !== undefined) {
        if (typeof c.spread !== "number" || (c.spread as number) <= 0 || (c.spread as number) > 1) {
          errors.push("comparable.spread must be a number between 0 (exclusive) and 1 (inclusive).");
        }
      }
    }
  }

  // ── Return ───────────────────────────────────────────
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // Safe cast — all fields have been validated above
  return { ok: true, data: body as unknown as ValuationEngineInput };
}