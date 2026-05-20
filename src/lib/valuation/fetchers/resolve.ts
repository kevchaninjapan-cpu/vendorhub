// ─────────────────────────────────────────────────────────────
// VendorHub — Valuation Resolver
//
// Orchestrates data fetchers and maps raw data into a
// ValuationEngineInput that the pure engine can consume.
//
// Strategy:
//  1. Try Auckland Council first (no key, ~550K properties)
//  2. Fall back to LINZ DVR (key required, ~250K properties)
//  3. If neither finds the property, throw
// ─────────────────────────────────────────────────────────────

import type { AddressQuery, LinzDvrRecord, AklCouncilRecord } from "./types";
import type { ValuationEngineInput, BuildingAttributes } from "../types";
import { fetchDvrByAddress } from "./linzDvr";
import { fetchAklByAddress, epochToIso, parseAreaLabel } from "./aucklandCouncil";
import { getHpiChange, getLatestHpiDate } from "./hpiLookup";
import { mapPropertyCategory } from "./categoryMap";
import { getRegionByTaCode } from "./taRegionMap";
import { PropertyCategory } from "../types";

// ── Constants ─────────────────────────────────────────────
const HECTARES_TO_SQM = 10_000;

// ── Error types ───────────────────────────────────────────

export class PropertyNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PropertyNotFoundError";
  }
}

export class MultipleMatchesError extends Error {
  public matches: Array<{ id: string; address: string; capitalValue: number; valuationDate: string; category: string }>;
  constructor(
    message: string,
    matches: Array<{ id: string; address: string; capitalValue: number; valuationDate: string; category: string }>,
  ) {
    super(message);
    this.name = "MultipleMatchesError";
    this.matches = matches;
  }
}

// ── LINZ helpers ──────────────────────────────────────────

function cleanLinzDate(raw: string): string {
  return raw.replace(/Z$/i, "");
}

function hectaresToSqm(hectares: number | null): number | undefined {
  if (!hectares || hectares <= 0) return undefined;
  return Math.round(hectares * HECTARES_TO_SQM);
}

function tryDisambiguateLinz(
  records: LinzDvrRecord[],
  suburb?: string,
): LinzDvrRecord | null {
  if (!suburb) return null;
  const suburbLower = suburb.toLowerCase();
  const filtered = records.filter(
    (r) =>
      r.legal_description?.toLowerCase().includes(suburbLower) ||
      r.situation_name?.toLowerCase().includes(suburbLower),
  );
  return filtered.length === 1 ? filtered[0] : null;
}

function extractBuildingAttributes(dvr: LinzDvrRecord): BuildingAttributes | undefined {
  const attrs: BuildingAttributes = {};
  let hasAny = false;

  if (dvr.building_condition_indicator) {
    attrs.conditionCode = dvr.building_condition_indicator.trim();
    hasAny = true;
  }
  if (dvr.mass_view) {
    attrs.viewCode = dvr.mass_view.trim();
    hasAny = true;
  }
  if (dvr.mass_scope_of_view) {
    attrs.viewScopeCode = dvr.mass_scope_of_view.trim();
    hasAny = true;
  }
  if (dvr.building_total_floor_area && dvr.building_total_floor_area > 0) {
    attrs.floorAreaSqm = dvr.building_total_floor_area;
    hasAny = true;
  }
  if (dvr.mass_total_living_area && dvr.mass_total_living_area > 0) {
    attrs.livingAreaSqm = dvr.mass_total_living_area;
    hasAny = true;
  }
  if (dvr.building_age_indicator) {
    attrs.ageIndicator = dvr.building_age_indicator.trim();
    hasAny = true;
  }
  if (dvr.no_of_bedrooms !== null && dvr.no_of_bedrooms !== undefined) {
    attrs.bedrooms = dvr.no_of_bedrooms;
    hasAny = true;
  }
  if (dvr.mass_garage_freestanding !== null && dvr.mass_garage_freestanding !== undefined) {
    attrs.garageFreestanding = dvr.mass_garage_freestanding;
    hasAny = true;
  }
  if (dvr.mass_garaged_under_main_roof !== null && dvr.mass_garaged_under_main_roof !== undefined) {
    attrs.garageUnderRoof = dvr.mass_garaged_under_main_roof;
    hasAny = true;
  }
  if (dvr.mass_deck) {
    attrs.hasDeck = dvr.mass_deck.trim();
    hasAny = true;
  }
  if (dvr.off_street_parking !== null && dvr.off_street_parking !== undefined) {
    attrs.offStreetParking = dvr.off_street_parking;
    hasAny = true;
  }

  return hasAny ? attrs : undefined;
}

// ── Auckland helpers ──────────────────────────────────────

/** Extract a clean single-line address from Auckland's multiline format */
function cleanAklAddress(raw: string): string {
  // "39 Bannerman Road\rWestern Springs\rAuckland 1022" → "39 Bannerman Road"
  return raw.split(/[\r\n]/)[0].trim();
}

/** Extract suburb from Auckland's multiline address */
function extractAklSuburb(raw: string): string | undefined {
  const parts = raw.split(/[\r\n]/).map((s) => s.trim()).filter(Boolean);
  // Second line is typically the suburb
  return parts.length >= 2 ? parts[1] : undefined;
}

function tryDisambiguateAkl(
  records: AklCouncilRecord[],
  suburb?: string,
): AklCouncilRecord | null {
  if (!suburb) return null;
  const suburbLower = suburb.toLowerCase();
  const filtered = records.filter((r) =>
    r.FORMATTEDADDRESS.toLowerCase().includes(suburbLower),
  );
  return filtered.length === 1 ? filtered[0] : null;
}

// ── Main resolver ─────────────────────────────────────────

export interface ResolveResult {
  input: ValuationEngineInput;
  matchedAddress: string;
  dvrRecordId: string;
  source: "AUCKLAND_COUNCIL" | "LINZ_DVR";
  rawRecord: LinzDvrRecord | AklCouncilRecord;
}

export async function resolveValuationInput(
  query: AddressQuery,
  apiKey: string,
): Promise<ResolveResult> {

  // ═══════════════════════════════════════════════════════
  //  STRATEGY 1: Try Auckland Council (free, no key, ~550K)
  // ═══════════════════════════════════════════════════════

  try {
    const aklRecords = await fetchAklByAddress(query);

    if (aklRecords.length > 0) {
      let akl: AklCouncilRecord;

      if (aklRecords.length === 1) {
        akl = aklRecords[0];
      } else {
        const disambiguated = tryDisambiguateAkl(aklRecords, query.suburb);
        if (disambiguated) {
          akl = disambiguated;
        } else {
          // Return matches for user selection
          throw new MultipleMatchesError(
            `${aklRecords.length} Auckland properties match "${query.streetNumber} ${query.streetName}". ` +
            `Supply a suburb to disambiguate, or select from the matches.`,
            aklRecords.map((r) => ({
              id: r.PROPERTYID,
              address: cleanAklAddress(r.FORMATTEDADDRESS),
              capitalValue: r.LCV || r.CV,
              valuationDate: epochToIso(r.LATESTVALUATIONDATE || r.VALUATIONDATE),
              category: "RESIDENTIAL",
            })),
          );
        }
      }

      // ── Use the 2024 reval (LCV) if available, else current CV ──
      const useLatest = akl.LCV && akl.LCV > 0;
      const cv = useLatest ? akl.LCV : akl.CV;
      const lv = useLatest ? akl.LLV : akl.LV;
      const valDate = epochToIso(
        useLatest && akl.LATESTVALUATIONDATE
          ? akl.LATESTVALUATIONDATE
          : akl.VALUATIONDATE,
      );

      const landAreaSqm = parseAreaLabel(akl.AREALABEL)
        ?? (akl.Shape__Area > 0 ? Math.round(akl.Shape__Area) : undefined);

      const suburb = extractAklSuburb(akl.FORMATTEDADDRESS) ?? query.suburb;

      // HPI lookup
      const hpi = getHpiChange(valDate);
      const hpiDate = getLatestHpiDate();

      const input: ValuationEngineInput = {
        ratingValuation: {
          capitalValue: cv,
          landValue: lv || undefined,
          valuationDate: valDate,
          source: "COUNCIL_CV",
        },
        property: {
          category: PropertyCategory.RESIDENTIAL, // Auckland residential default
          suburb,
          landAreaSqm,
        },
        ...(hpi
          ? {
              regionalIndex: {
                region: "Auckland",
                percentChange: hpi.percentChange,
                indexDate: hpiDate!,
              },
            }
          : {}),
        // No building attributes from Auckland Council (Layer D won't fire)
      };

      return {
        input,
        matchedAddress: cleanAklAddress(akl.FORMATTEDADDRESS),
        dvrRecordId: akl.PROPERTYID,
        source: "AUCKLAND_COUNCIL",
        rawRecord: akl,
      };
    }
  } catch (err) {
    // If it's a MultipleMatchesError, re-throw it (user needs to pick)
    if (err instanceof MultipleMatchesError) throw err;
    // Otherwise swallow and fall through to LINZ
    console.warn("Auckland Council lookup failed, trying LINZ:", err);
  }

  // ═══════════════════════════════════════════════════════
  //  STRATEGY 2: Fall back to LINZ DVR (key required, ~250K)
  // ═══════════════════════════════════════════════════════

  const records = await fetchDvrByAddress(query, apiKey);

  if (records.length === 0) {
    throw new PropertyNotFoundError(
      `No rating valuation found for "${query.streetNumber} ${query.streetName}". ` +
      `Searched Auckland Council and LINZ open DVR. ` +
      `Try the full street name or check data.linz.govt.nz directly.`,
    );
  }

  let dvr: LinzDvrRecord;

  if (records.length === 1) {
    dvr = records[0];
  } else {
    const disambiguated = tryDisambiguateLinz(records, query.suburb);
    if (disambiguated) {
      dvr = disambiguated;
    } else {
      throw new MultipleMatchesError(
        `${records.length} properties match "${query.streetNumber} ${query.streetName}". ` +
        `Supply a suburb to disambiguate, or select from the matches.`,
        records.map((m) => ({
          id: m.unit_of_property_id,
          address: `${m.situation_number} ${m.situation_name}`.trim(),
          capitalValue: m.capital_value,
          valuationDate: m.current_effective_valuation_date,
          category: m.property_category,
        })),
      );
    }
  }

  const cleanDate = cleanLinzDate(dvr.current_effective_valuation_date);
  const landAreaSqm = hectaresToSqm(dvr.land_area);
  const hpi = getHpiChange(cleanDate);
  const hpiDate = getLatestHpiDate();
  const category = mapPropertyCategory(dvr.property_category);
  const region = getRegionByTaCode(dvr.district_ta_code);
  const buildingAttributes = extractBuildingAttributes(dvr);

  const input: ValuationEngineInput = {
    ratingValuation: {
      capitalValue: dvr.capital_value,
      landValue: dvr.land_value || undefined,
      improvementsValue: dvr.improvements_value || undefined,
      valuationDate: cleanDate,
      source: "LINZ_DVR",
    },
    property: {
      category,
      suburb: query.suburb,
      landAreaSqm,
    },
    ...(hpi
      ? {
          regionalIndex: {
            region,
            percentChange: hpi.percentChange,
            indexDate: hpiDate!,
          },
        }
      : {}),
    ...(buildingAttributes ? { buildingAttributes } : {}),
  };

  return {
    input,
    matchedAddress: `${dvr.situation_number} ${dvr.situation_name}`.trim(),
    dvrRecordId: dvr.unit_of_property_id,
    source: "LINZ_DVR",
    rawRecord: dvr,
  };
}