// ─────────────────────────────────────────────────────────────
// VendorHub — Auckland Council Property Valuation Fetcher
//
// Source: Auckland Council 2024 Revaluation (ArcGIS FeatureServer)
// Endpoint: AGOL_RateAccountInfo1_gdb/FeatureServer/0
// No API key required. Public, CC-BY 4.0.
//
// Coverage: ~550K Auckland properties (all Auckland TAs)
// ─────────────────────────────────────────────────────────────

import type { AklCouncilRecord, AklCouncilResponse, AddressQuery } from "./types";

// ── Constants ─────────────────────────────────────────────
const AKL_BASE =
  "https://services1.arcgis.com/n4yPwebTjJCmXB6W/arcgis/rest/services/AGOL_RateAccountInfo1_gdb/FeatureServer/0/query";
const MAX_RESULTS = 10;

// ── Street name normalisation ─────────────────────────────
// Auckland Council stores full street types ("Road" not "Rd")
// so we do the opposite of the LINZ normaliser

const STREET_EXPANSIONS: [RegExp, string][] = [
  [/\bSt\b/gi, "Street"],
  [/\bRd\b/gi, "Road"],
  [/\bAve\b/gi, "Avenue"],
  [/\bDr\b/gi, "Drive"],
  [/\bPl\b/gi, "Place"],
  [/\bCres\b/gi, "Crescent"],
  [/\bTce\b/gi, "Terrace"],
  [/\bCt\b/gi, "Court"],
  [/\bCl\b/gi, "Close"],
  [/\bLn\b/gi, "Lane"],
  [/\bPde\b/gi, "Parade"],
  [/\bEsp\b/gi, "Esplanade"],
  [/\bHwy\b/gi, "Highway"],
  [/\bGr\b/gi, "Grove"],
  [/\bBlvd\b/gi, "Boulevard"],
  [/\bCct\b/gi, "Circuit"],
];

function expandStreetName(name: string): string {
  let expanded = name.trim();
  for (const [pattern, replacement] of STREET_EXPANSIONS) {
    expanded = expanded.replace(pattern, replacement);
  }
  return expanded;
}

// ── SQL injection prevention ──────────────────────────────

function escapeSql(value: string): string {
  return value.replace(/'/g, "''").trim();
}

// ── Helpers ───────────────────────────────────────────────

/** Convert ArcGIS epoch ms to ISO date string */
export function epochToIso(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
}

/** Parse AREALABEL "650 M2" → number or undefined */
export function parseAreaLabel(label: string): number | undefined {
  if (!label) return undefined;
  const match = label.match(/^([\d.]+)\s*M2$/i);
  if (!match) return undefined;
  const val = parseFloat(match[1]);
  return val > 0 ? val : undefined;
}

// ── Main fetcher ──────────────────────────────────────────

/**
 * Fetch property valuations from Auckland Council's ArcGIS API.
 *
 * @param query - Street address to search
 * @returns Array of matching Auckland Council records (may be empty)
 * @throws On network failure or bad response
 */
export async function fetchAklByAddress(
  query: AddressQuery,
): Promise<AklCouncilRecord[]> {
  if (!query.streetName?.trim()) {
    throw new Error("streetName is required for address lookup.");
  }

  // ── Build the search string ────────────────────────────
  // FORMATTEDADDRESS contains: "39 Bannerman Road\rWestern Springs\rAuckland 1022"
  // We search with LIKE to match flexibly.

  const expandedStreet = expandStreetName(query.streetName);

  let searchParts: string[] = [];

  if (query.streetNumber?.trim()) {
    // Search for "NUMBER STREET" at the start of the address
    searchParts.push(
      `FORMATTEDADDRESS LIKE '${escapeSql(query.streetNumber)} ${escapeSql(expandedStreet)}%'`,
    );
  } else {
    searchParts.push(
      `FORMATTEDADDRESS LIKE '%${escapeSql(expandedStreet)}%'`,
    );
  }

  // If suburb is supplied, add it as an additional filter
  if (query.suburb?.trim()) {
    searchParts.push(
      `FORMATTEDADDRESS LIKE '%${escapeSql(query.suburb)}%'`,
    );
  }

  const whereClause = searchParts.join(" AND ");

  // ── Build URL ──────────────────────────────────────────
  const params = new URLSearchParams({
    where: whereClause,
    outFields: "*",
    f: "json",
    resultRecordCount: String(MAX_RESULTS),
    returnGeometry: "false",
  });

  const url = `${AKL_BASE}?${params.toString()}`;

  // ── Fetch ──────────────────────────────────────────────
  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Auckland Council API ${res.status}: ${body.slice(0, 300)}`,
    );
  }

  const data = (await res.json()) as AklCouncilResponse;

  if (!data.features || data.features.length === 0) {
    return [];
  }

  return data.features.map((f) => f.attributes);
}