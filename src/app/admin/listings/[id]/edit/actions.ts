// src/app/admin/listings/[id]/edit/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type ListingUpdate =
  Database["public"]["Tables"]["listings"]["Update"];

export async function updateListingAction(
  listingId: string,
  data: ListingUpdate
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("listings")
    .update(data)
    .eq("id", listingId);

  if (error) {
    throw new Error(error.message);
  }
}
``