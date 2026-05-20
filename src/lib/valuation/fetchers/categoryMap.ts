// ─────────────────────────────────────────────────────────────
// VendorHub — LINZ Property Category → Engine Category Mapper
//
// LINZ DVR property_category uses multi-character codes from
// the Rating Valuations Rules 2008 (LINZS30300).
//
// Real examples from live data:
//   "LI198B "  → Lifestyle       → RURAL
//   "R "       → Residential     → RESIDENTIAL
//   "RF"       → Res. Flats      → RESIDENTIAL
//   "RA"       → Res. Apartment  → APARTMENT
//   "C "       → Commercial      → UNKNOWN
//   "F "       → Farming         → RURAL
//
// The first 1–2 characters carry the primary classification.
// We strip whitespace and inspect the leading chars.
// ─────────────────────────────────────────────────────────────

import { PropertyCategory } from "../types";

/**
 * Map a LINZ DVR property_category code to the engine's
 * PropertyCategory enum.
 *
 * Conservative — anything we can't confidently classify
 * falls to UNKNOWN, which triggers LOW confidence.
 */
export function mapPropertyCategory(linzCode: string): PropertyCategory {
  if (!linzCode) return PropertyCategory.UNKNOWN;

  // Strip whitespace — LINZ pads with trailing spaces
  const code = linzCode.trim().toUpperCase();

  if (code.length === 0) return PropertyCategory.UNKNOWN;

  // ── First character drives the primary classification ──
  const lead = code[0];

  // ── Residential (R) ────────────────────────────────────
  if (lead === "R") {
    // "RA" = Residential Apartment
    if (code.length >= 2 && code[1] === "A") {
      return PropertyCategory.APARTMENT;
    }
    // All other R-codes: R, RF (flats), RH (home & income), etc.
    return PropertyCategory.RESIDENTIAL;
  }

  // ── Lifestyle (L) → RURAL ─────────────────────────────
  //    Codes: L, LI, LI198B, etc.
  if (lead === "L") {
    return PropertyCategory.RURAL;
  }

  // ── Farming (F) → RURAL ───────────────────────────────
  //    Codes: F, FD (dairy), FS (sheep), etc.
  if (lead === "F") {
    return PropertyCategory.RURAL;
  }

  // ── Everything else → UNKNOWN ──────────────────────────
  //    C (Commercial), I (Industrial), S (Special),
  //    M (Mining), U (Utility), etc.
  //    These are out of scope for residential valuation.
  return PropertyCategory.UNKNOWN;
}