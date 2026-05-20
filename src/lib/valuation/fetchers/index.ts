export { fetchDvrByAddress } from "./linzDvr";
export { fetchAklByAddress, epochToIso, parseAreaLabel } from "./aucklandCouncil";
export { getHpiChange, getLatestHpiDate } from "./hpiLookup";
export { mapPropertyCategory } from "./categoryMap";
export { getRegionByTaCode } from "./taRegionMap";
export {
  resolveValuationInput,
  PropertyNotFoundError,
  MultipleMatchesError,
} from "./resolve";

export type {
  LinzDvrRecord,
  LinzWfsResponse,
  AklCouncilRecord,
  AklCouncilResponse,
  AddressQuery,
  ResolvedProperty,
} from "./types";
export type { ResolveResult } from "./resolve";
export type { HpiResult } from "./hpiLookup";