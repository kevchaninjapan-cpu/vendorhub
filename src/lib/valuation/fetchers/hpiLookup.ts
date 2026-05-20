// ─────────────────────────────────────────────────────────────
// VendorHub — National House Price Index Lookup
//
// Source: RBNZ M10 Housing Statistics (CoreLogic HPI)
// https://www.rbnz.govt.nz/statistics/series/economic-indicators/housing
//
// Refresh cadence: quarterly (after RBNZ publishes, ~4 months lag)
// Last refresh: Q4 2025 (released April 2026)
//
// To update: download M10 XLSX from RBNZ, read the "House price
// index" column, and add/update entries below.
// ─────────────────────────────────────────────────────────────

// ── Quarterly HPI time series ─────────────────────────────
// Key format: "YYYY-MM" where MM is quarter-end month
// Value: CoreLogic HPI index level (base = 1000 in Q1 2005)

const NATIONAL_HPI: [string, number][] = [
  // 2023 — annual figure published by RBNZ
  ["2023-12", 3464],
  // 2024 — annual figure published by RBNZ
  ["2024-12", 3414],
  // 2025 — quarterly figures from RBNZ M10
  ["2025-03", 3412],
  ["2025-06", 3375],
  ["2025-09", 3376],
  ["2025-12", 3389],
  // ─── ADD NEW QUARTERS BELOW THIS LINE ───
];

// Pre-sort chronologically (earliest first)
const SORTED_HPI = [...NATIONAL_HPI].sort(
  ([a], [b]) => a.localeCompare(b),
);

// ── Helpers ───────────────────────────────────────────────

/** Convert an ISO date to its nearest quarter key "YYYY-MM" */
function toQuarterKey(isoDate: string): string {
  const d = new Date(isoDate);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12

  // Map month to quarter-end month
  let qMonth: number;
  if (month <= 3) qMonth = 3;
  else if (month <= 6) qMonth = 6;
  else if (month <= 9) qMonth = 9;
  else qMonth = 12;

  return `${year}-${String(qMonth).padStart(2, "0")}`;
}

/** Find the HPI value for a quarter key, or the nearest available */
function findNearest(quarterKey: string): [string, number] | null {
  if (SORTED_HPI.length === 0) return null;

  // Exact match
  const exact = SORTED_HPI.find(([k]) => k === quarterKey);
  if (exact) return exact;

  // Find the closest by date distance
  let closest = SORTED_HPI[0];
  let minDist = Infinity;

  for (const entry of SORTED_HPI) {
    const dist = Math.abs(
      new Date(entry[0] + "-01").getTime() -
        new Date(quarterKey + "-01").getTime(),
    );
    if (dist < minDist) {
      minDist = dist;
      closest = entry;
    }
  }

  return closest;
}

// ── Public API ────────────────────────────────────────────

export interface HpiResult {
  percentChange: number;  // e.g. 8.3 = +8.3%
  fromQuarter: string;    // quarter used for the valuation date
  toQuarter: string;      // latest quarter in the series
  fromIndex: number;      // HPI at valuation quarter
  toIndex: number;        // HPI at latest quarter
}

/**
 * Calculate the national HPI % change between a valuation date
 * and the latest available quarter.
 *
 * @param valuationDate - ISO date of the rating valuation
 * @returns HpiResult or null if insufficient data
 */
export function getHpiChange(valuationDate: string): HpiResult | null {
  if (SORTED_HPI.length < 2) return null;

  const valQuarter = toQuarterKey(valuationDate);
  const fromEntry = findNearest(valQuarter);
  const toEntry = SORTED_HPI[SORTED_HPI.length - 1]; // latest

  if (!fromEntry || !toEntry) return null;

  // Don't adjust if valuation is from the same quarter as latest
  if (fromEntry[0] === toEntry[0]) return null;

  const percentChange =
    ((toEntry[1] - fromEntry[1]) / fromEntry[1]) * 100;

  return {
    percentChange: Math.round(percentChange * 100) / 100, // 2 d.p.
    fromQuarter: fromEntry[0],
    toQuarter: toEntry[0],
    fromIndex: fromEntry[1],
    toIndex: toEntry[1],
  };
}

/** Returns the date of the latest HPI data point as ISO string */
export function getLatestHpiDate(): string | null {
  if (SORTED_HPI.length === 0) return null;
  const [key] = SORTED_HPI[SORTED_HPI.length - 1];
  return `${key}-01`;
}