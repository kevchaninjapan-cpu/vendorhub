import { createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type ListingUpdate = Database["public"]["Tables"]["listings"]["Update"];

export async function updateListing(
  id: string,
  patchData: Omit<ListingUpdate, "id">
) {
  const supabase = await createServerClient();

  const patch: ListingUpdate = {
    ...patchData,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("listings")
    .update(patch)
    .eq("id", id);

  if (error) throw new Error(error.message);
}
