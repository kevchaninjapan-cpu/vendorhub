import type { DvrRecord } from "./types";

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function yearsSince(dateIso: string | null): number | null {
  if (!dateIso) return null;
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return null;
  const ms = Date.now() - d.getTime();
  return ms / (1000 * 60 * 60 * 24 * 365.25);
}

export function similarityScore(subject: DvrRecord, comp: DvrRecord): number {
  let score = 0;
  let weight = 0;

  // Category match
  weight += 0.25;
  score +=
    subject.property_category &&
    comp.property_category &&
    subject.property_category === comp.property_category
      ? 0.25
      : 0;

  // Bedrooms closeness
  weight += 0.2;
  if (subject.no_of_bedrooms != null && comp.no_of_bedrooms != null) {
    const diff = Math.abs(subject.no_of_bedrooms - comp.no_of_bedrooms);
    score += 0.2 * (diff === 0 ? 1 : diff === 1 ? 0.6 : 0.2);
  } else {
    score += 0.2 * 0.35;
  }

  // Land area closeness
  weight += 0.25;
  if (subject.land_area && comp.land_area && subject.land_area > 0 && comp.land_area > 0) {
    const ratio = comp.land_area / subject.land_area;
    const closeness = clamp01(1 - Math.min(Math.abs(Math.log(ratio)), 1));
    score += 0.25 * closeness;
  } else {
    score += 0.25 * 0.35;
  }

  // Same TA code (location proxy)
  weight += 0.2;
  score +=
    subject.district_ta_code != null &&
    comp.district_ta_code != null &&
    subject.district_ta_code === comp.district_ta_code
      ? 0.2
      : 0.05;

  // Recency
  weight += 0.1;
  const ys = yearsSince(comp.current_effective_valuation_date);
  if (ys == null) score += 0.1 * 0.35;
  else score += 0.1 * clamp01(1 - ys / 6);

  return clamp01(score / weight);
}