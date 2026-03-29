"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export async function archiveListingAction(listingId: string) {
  const supabase = await createServerClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) redirect("/login");

  const { error } = await supabase
    .from("listings")
    .update({ status: "archived" })
    .eq("id", listingId);

  if (error) {
    console.error("[ARCHIVE_LISTING_ACTION_ERROR]", error);
    throw new Error("Unable to archive listing");
  }

  redirect(`/admin/listings/${listingId}`);
}
``