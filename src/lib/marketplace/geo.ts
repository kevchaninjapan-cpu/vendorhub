import bbox from "@turf/bbox";
import { featureCollection, point } from "@turf/helpers";
import type { SearchListing } from "@/types/marketplace-public";

export const AUCKLAND_DEFAULT_VIEW = {
  center: [174.7633, -36.8485] as [number, number],
  zoom: 10,
};

export function listingsBbox(listings: SearchListing[]): [number, number, number, number] | null {
  const pts = listings
    .filter((l) => l.lng != null && l.lat != null)
    .map((l) => point([l.lng!, l.lat!]));
  if (pts.length === 0) return null;
  return bbox(featureCollection(pts)) as [number, number, number, number];
}

export function bboxToString(b: [number, number, number, number]) {
  return b.join(",");
}

export function parseBboxString(s: string | null): [number, number, number, number] | null {
  if (!s) return null;
  const parts = s.split(",").map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return null;
  return parts as [number, number, number, number];
}