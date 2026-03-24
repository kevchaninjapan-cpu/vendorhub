// app/admin/listings/[id]/image-actions.ts
"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/requireAdmin";

const BUCKET = "listing-photos";

type ImageRow = {
  id: string;
  listing_id: string;
  storage_path: string | null;
  alt: string | null;
  sort_order: number | null;
  is_cover: boolean | null;
  created_at: string | null;
};

async function getSupabaseServer() {
  // 🔒 ensure only admins can run any of these actions
  await requireAdmin();

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

async function fetchOrderedImages(supabase: ReturnType<typeof createServerClient>, listingId: string) {
  const { data, error } = await supabase
    .from("listing_images")
    .select("id, listing_id, storage_path, alt, sort_order, is_cover, created_at")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ImageRow[];
}

async function rewriteSequentialSortOrders(
  supabase: ReturnType<typeof createServerClient>,
  listingId: string,
  orderedIds: string[]
) {
  // Sets sort_order = 1..n for all images in the given order
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i];
    const sort_order = i + 1;

    const { error } = await supabase
      .from("listing_images")
      .update({ sort_order })
      .eq("id", id)
      .eq("listing_id", listingId);

    if (error) throw new Error(error.message);
  }
}

/**
 * Set an image as the cover for a listing.
 * Input form fields:
 * - listing_id
 * - image_id
 */
export async function setCoverImage(formData: FormData) {
  const listingId = String(formData.get("listing_id") ?? "");
  const imageId = String(formData.get("image_id") ?? "");
  if (!listingId || !imageId) throw new Error("Missing listing_id or image_id");

  const supabase = await getSupabaseServer();

  // unset old cover
  const { error: unsetErr } = await supabase
    .from("listing_images")
    .update({ is_cover: false })
    .eq("listing_id", listingId)
    .eq("is_cover", true);

  if (unsetErr) throw new Error(unsetErr.message);

  // set new cover
  const { error: setErr } = await supabase
    .from("listing_images")
    .update({ is_cover: true })
    .eq("id", imageId)
    .eq("listing_id", listingId);

  if (setErr) throw new Error(setErr.message);

  revalidatePath(`/admin/listings/${listingId}`);
}

/**
 * Delete an image: remove object from Storage AND delete DB row.
 * Input form fields:
 * - listing_id
 * - image_id
 */
export async function deleteImage(formData: FormData) {
  const listingId = String(formData.get("listing_id") ?? "");
  const imageId = String(formData.get("image_id") ?? "");
  if (!listingId || !imageId) throw new Error("Missing listing_id or image_id");

  const supabase = await getSupabaseServer();

  // Fetch storage_path first
  const { data: row, error: fetchErr } = await supabase
    .from("listing_images")
    .select("id, listing_id, storage_path")
    .eq("id", imageId)
    .eq("listing_id", listingId)
    .single();

  if (fetchErr) throw new Error(fetchErr.message);

  const storagePath = (row as { storage_path: string | null }).storage_path;

  // Delete from Storage first (so DB doesn't lose the key)
  if (storagePath) {
    const { error: storageErr } = await supabase.storage.from(BUCKET).remove([storagePath]);
    if (storageErr) throw new Error(storageErr.message);
  }

  // Delete DB row
  const { error: delErr } = await supabase
    .from("listing_images")
    .delete()
    .eq("id", imageId)
    .eq("listing_id", listingId);

  if (delErr) throw new Error(delErr.message);

  revalidatePath(`/admin/listings/${listingId}`);
}

/**
 * Move an image up in ordering (rewrite sequential sort orders).
 * Input form fields:
 * - listing_id
 * - image_id
 */
export async function moveImageUp(formData: FormData) {
  const listingId = String(formData.get("listing_id") ?? "");
  const imageId = String(formData.get("image_id") ?? "");
  if (!listingId || !imageId) throw new Error("Missing listing_id or image_id");

  const supabase = await getSupabaseServer();

  const images = await fetchOrderedImages(supabase, listingId);
  const ids = images.map((i) => i.id);
  const idx = ids.indexOf(imageId);

  if (idx <= 0) {
    // already at top or not found
    return;
  }

  // swap with previous
  const swapped = [...ids];
  [swapped[idx - 1], swapped[idx]] = [swapped[idx], swapped[idx - 1]];

  await rewriteSequentialSortOrders(supabase, listingId, swapped);
  revalidatePath(`/admin/listings/${listingId}`);
}

/**
 * Move an image down in ordering (rewrite sequential sort orders).
 * Input form fields:
 * - listing_id
 * - image_id
 */
export async function moveImageDown(formData: FormData) {
  const listingId = String(formData.get("listing_id") ?? "");
  const imageId = String(formData.get("image_id") ?? "");
  if (!listingId || !imageId) throw new Error("Missing listing_id or image_id");

  const supabase = await getSupabaseServer();

  const images = await fetchOrderedImages(supabase, listingId);
  const ids = images.map((i) => i.id);
  const idx = ids.indexOf(imageId);

  if (idx === -1 || idx >= ids.length - 1) {
    // already at bottom or not found
    return;
  }

  // swap with next
  const swapped = [...ids];
  [swapped[idx], swapped[idx + 1]] = [swapped[idx + 1], swapped[idx]];

  await rewriteSequentialSortOrders(supabase, listingId, swapped);
  revalidatePath(`/admin/listings/${listingId}`);
}

/**
 * Update alt text.
 * Input form fields:
 * - listing_id
 * - image_id
 * - alt
 */
export async function updateAltText(formData: FormData) {
  const listingId = String(formData.get("listing_id") ?? "");
  const imageId = String(formData.get("image_id") ?? "");
  const alt = String(formData.get("alt") ?? "").trim() || null;

  if (!listingId || !imageId) throw new Error("Missing listing_id or image_id");

  const supabase = await getSupabaseServer();

  const { error } = await supabase
    .from("listing_images")
    .update({ alt })
    .eq("id", imageId)
    .eq("listing_id", listingId);

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/listings/${listingId}`);
}
