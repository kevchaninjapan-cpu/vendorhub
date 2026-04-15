// src/app/dashboard/listings/[id]/actions.ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type ListingUpdate =
  Database["public"]["Tables"]["listings"]["Update"];

export async function archiveListingAction(listingId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("listings")
    .update({ status: "withdrawn" })
    .eq("id", listingId);

  if (error) {
    throw new Error(error.message);
  }

  redirect("/dashboard/listings");
}
``