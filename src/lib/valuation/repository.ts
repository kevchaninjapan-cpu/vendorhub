import { supabaseAdmin } from "../supabase/admin";
import type { DvrRecord } from "./types";
import { resolveUnitIdFromAddress, type ResolveResult } from "./addressResolver";

export async function getDvrByUnitId(unitId: string): Promise<DvrRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("nz_dvr_114085")
    .select("*")
    .eq("unit_of_property_id", unitId)
    .maybeSingle();

  if (error) throw new Error(`getDvrByUnitId error: ${error.message}`);
  return (data as DvrRecord) ?? null;
}

export async function resolveAddress(address: string): Promise<ResolveResult> {
  return resolveUnitIdFromAddress(address);
}

export async function findComparableCandidates(
  subject: DvrRecord,
  limit = 250,
): Promise<DvrRecord[]> {
  const q = supabaseAdmin.from("nz_dvr_114085").select("*").limit(limit);

  const q1 =
    subject.district_ta_code != null
      ? q.eq("district_ta_code", subject.district_ta_code)
      : q;
  const q2 = subject.property_category
    ? q1.eq("property_category", subject.property_category)
    : q1;

  const { data, error } = await q2.not("capital_value", "is", null);

  if (error) throw new Error(`findComparableCandidates error: ${error.message}`);
  return (data as DvrRecord[]) ?? [];
}