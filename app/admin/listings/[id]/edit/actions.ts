// src/app/admin/listings/[id]/edit/actions.ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminAuth } from "@/lib/guards";

function cleanStr(v: FormDataEntryValue | null) {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

export async function updateListingAction(id: string, formData: FormData) {
  await requireAdminAuth();

  const supabase = createAdminClient();

  const title = cleanStr(formData.get("title"));
  const suburb = cleanStr(formData.get("suburb"));
  const city = cleanStr(formData.get("city"));
  const price_display = cleanStr(formData.get("price_display"));
  const status = cleanStr(formData.get("status"));
  const property_type = cleanStr(formData.get("property_type"));

  const patch: Record<string, any> = {
    ...(title && { title }),
    ...(suburb && { suburb }),
    ...(city && { city }),
    ...(price_display && { price_display }),
    ...(status && { status }),
    ...(property_type && { property_type }),
  };

  if (!Object.keys(patch).length) {
    redirect(`/admin/listings/${id}`);
  }

  const { error } = await supabase
    .from("listings")
    .update(patch)
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/listings");
  revalidatePath(`/admin/listings/${id}`);
  revalidatePath(`/admin/listings/${id}/edit`);

  redirect(`/admin/listings/${id}`);
}
``