// lib/db/listings.ts
import "server-only";
import { createSupabaseServerClient } from "@/utils/supabase/server";

/**
 * Reads all listings for the admin table.
 * Assumes the table has: id, title, price (integer cents), status, created_at
 */
export async function getAllListings() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("listings")
    .select(
      `
      id,
      title,
      price,
      status,
      created_at
    `
    )
    .order("created_at", { ascending: false });

  if (error) return { data: null, error };
  return { data, error: null };
}

/**
 * Fetch a single listing by id.
 */
export async function getListingById(id: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { data: null, error };
  return { data, error: null };
}