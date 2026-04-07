// src/lib/db/listings.ts
import "server-only";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Centralised DB helpers for listings.
 * Uses the shared Supabase server client wrapper.
 * Safe in Server Components and Route Handlers.
 */

export type ListingInsert = {
  owner_id: string;
  title: string;
  description?: string | null;
  price_numeric?: number | null;
  price_display?: string | null;
  status?: "draft" | "active" | "under_offer" | "sold" | "withdrawn";
  property_type?:
    | "house"
    | "apartment"
    | "townhouse"
    | "unit"
    | "section"
    | "lifestyle"
    | "rural"
    | "other"
    | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  car_spaces?: number | null;
  floor_area_m2?: number | null;
  land_area_m2?: number | null;
  year_built?: number | null;
  address_line1?: string | null;
  address_line2?: string | null;
  suburb?: string | null;
  city?: string | null;
  region?: string | null;
  postcode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  slug?: string | null;
  published_at?: string | null;
  expires_at?: string | null;
};

export type ListingUpdate = Omit<ListingInsert, "owner_id"> & {
  deleted_at?: string | null;
  updated_at?: string | null;
};

async function getSupabase() {
  return await createServerClient();
}

export async function getAllListings(opts?: {
  includeDeleted?: boolean;
  limit?: number;
}) {
  const supabase = await getSupabase();

  let q = supabase
    .from("listings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(opts?.limit ?? 200);

  if (!opts?.includeDeleted) {
    q = q.is("deleted_at", null);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getListingById(id: string) {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createListing(payload: ListingInsert) {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from("listings")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateListing(id: string, patch: ListingUpdate) {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from("listings")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Soft delete: sets deleted_at timestamp.
 * Does NOT change enum status.
 */
export async function softDeleteListing(id: string) {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from("listings")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}
