// app/admin/listings/[id]/actions.ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminAuth } from "@/lib/guards";

/**
 * Archive a listing (sets status to 'archived')
 */
export async function archiveListingAction(id: string) {
  // Ensure caller is authenticated as admin (your guard handles redirect)
  await requireAdminAuth();

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("listings")
    .update({ status: "withdrawn" })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  // Refresh admin pages that read this data
  revalidatePath("/admin/listings");
  revalidatePath(`/admin/listings/${id}`);

  // Stay on detail page
  redirect(`/admin/listings/${id}`);
}

/**
 * Restore a listing (sets status to 'draft')
 */
export async function restoreListingToDraftAction(id: string) {
  await requireAdminAuth();

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("listings")
    .update({ status: "draft" })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/listings");
  revalidatePath(`/admin/listings/${id}`);

  redirect(`/admin/listings/${id}`);
}
