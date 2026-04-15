import { createClient } from "@/lib/supabase/server";

export async function getListingsByUser(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch listings: ${error.message}`);
  }

  return data;
}

export async function getListingById(listingId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch listing: ${error.message}`);
  }

  return data;
}

export async function createListing(input: {
  user_id: string;
  title: string;
  price?: number | null;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("listings")
    .insert(input)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create listing: ${error.message}`);
  }

  return data;
}

export async function updateListing(
  listingId: string,
  updates: Partial<{
    title: string;
    price: number | null;
    status: string;
  }>
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("listings")
    .update(updates)
    .eq("id", listingId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update listing: ${error.message}`);
  }

  return data;
}

export async function deleteListing(listingId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("listings")
    .delete()
    .eq("id", listingId);

  if (error) {
    throw new Error(`Failed to delete listing: ${error.message}`);
  }
}
``