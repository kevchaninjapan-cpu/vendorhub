import type { LinzDvrRecord, LinzWfsResponse, AddressQuery } from "./types";

const LINZ_BASE = "https://data.linz.govt.nz/services";
const DVR_TABLE = 114085;
const MAX_RESULTS = 10;

// ── Street type abbreviations (LINZ uses short forms) ─────
const STREET_ABBREVIATIONS: [RegExp, string][] = [
  [/\bstreet\b/gi, "St"],
  [/\broad\b/gi, "Rd"],
  [/\bavenue\b/gi, "Ave"],
  [/\bdrive\b/gi, "Dr"],
  [/\bplace\b/gi, "Pl"],
  [/\bcrescent\b/gi, "Cres"],
  [/\bterrace\b/gi, "Tce"],
  [/\bcourt\b/gi, "Ct"],
  [/\bclose\b/gi, "Cl"],
  [/\blane\b/gi, "Ln"],
  [/\bway\b/gi, "Way"],
  [/\bparade\b/gi, "Pde"],
  [/\besplanade\b/gi, "Esp"],
  [/\bhighway\b/gi, "Hwy"],
  [/\bgrove\b/gi, "Gr"],
  [/\bboulevard\b/gi, "Blvd"],
  [/\bcircuit\b/gi, "Cct"],
  [/\bquay\b/gi, "Quay"],
  [/\brise\b/gi, "Rise"],
  [/\bview\b/gi, "View"],
];

/**
 * Normalize a street name to match LINZ abbreviated format.
 * e.g. "Devon Street" → "Devon St", "Wilderness Road" → "Wilderness Rd"
 */
function normalizeStreetName(name: string): string {
  let normalized = name.trim();
  for (const [pattern, replacement] of STREET_ABBREVIATIONS) {
    normalized = normalized.replace(pattern, replacement);
  }
  return normalized;
}

function escapeCql(value: string): string {
  return value.replace(/'/g, "''").trim();
}

export async function fetchDvrByAddress(
  query: AddressQuery,
  apiKey: string,
): Promise<LinzDvrRecord[]> {
  if (!apiKey?.trim()) {
    throw new Error(
      "LINZ_API_KEY is required. Register free at https://data.linz.govt.nz",
    );
  }

  if (!query.streetName?.trim()) {
    throw new Error("streetName is required for address lookup.");
  }

  // Normalize street name (e.g. "Devon Street" → "Devon St")
  const normalizedStreet = normalizeStreetName(query.streetName);

  // ── Build CQL filter ──────────────────────────────────
  const clauses: string[] = [];

  clauses.push(
    `situation_name ILIKE '%${escapeCql(normalizedStreet)}%'`,
  );

  if (query.streetNumber?.trim()) {
    clauses.push(
      `situation_number='${escapeCql(query.streetNumber)}'`,
    );
  }

  const cqlFilter = clauses.join(" AND ");

  const params = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    typeNames: `table-${DVR_TABLE}`,
    outputFormat: "application/json",
    count: String(MAX_RESULTS),
    CQL_FILTER: cqlFilter,
  });

  const url = `${LINZ_BASE};key=${apiKey}/wfs?${params.toString()}`;

  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `LINZ API ${res.status}: ${body.slice(0, 300)}`,
    );
  }

  const data = (await res.json()) as LinzWfsResponse;

  return data.features.map((f) => f.properties);
}