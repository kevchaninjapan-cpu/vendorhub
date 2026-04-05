"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { requireAdminAuth } from "@/lib/guards";

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

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)");
  if (!serviceRole) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceRole, {
    auth: { persistSession: false },
  });
}

/**
 * Internal helper: fetch images in the same order as the UI expects.
 * cover first, then sort_order (nulls first), then created_at
 */
async function fetchOrderedImages(supabase: ReturnType<typeof getSupabaseAdmin>, listingId: string) {
  const { data, error } = await supabase
    .from("listing_images")
    .select("id, listing_id, storage_path, alt, sort_order, is_cover, created_at")
    .eq("listing_id", listingId)
    .order("is_cover", { ascending: false })
    .order("sort_order", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ImageRow[];
}

/**
 * Internal helper: bulk upsert sort_order in one call.
 * Uses sort_order = index (0..n-1) for simplicity.
 */
async function bulkSetSortOrder(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  listingId: string,
  orderedIds: string[]
) {
  if (!orderedIds.length) return;

  const updates = orderedIds.map((id, index) => ({
    id,
    listing_id: listingId,
    sort_order: index,
  }));

  const { error } = await supabase
    .from("listing_images")
    .upsert(updates, { onConflict: "id" });

  if (error) throw new Error(error.message);
}

/**
 * Set an image as the cover for a listing.
 * Input form fields:
 * - listing_id
 * - image_id
 */
export async function setCoverImage(formData: FormData) {
  await requireAdminAuth();

  const listingId = String(formData.get("listing_id") ?? "");
  const imageId = String(formData.get("image_id") ?? "");
  if (!listingId || !imageId) throw new Error("Missing listing_id or image_id");

  const supabase = getSupabaseAdmin();

  // Unset existing cover(s) for listing
  const { error: unsetErr } = await supabase
    .from("listing_images")
    .update({ is_cover: false })
    .eq("listing_id", listingId);

  if (unsetErr) throw new Error(unsetErr.message);

  // Set selected cover (and ensure it belongs to listing)
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
  await requireAdminAuth();

  const listingId = String(formData.get("listing_id") ?? "");
  const imageId = String(formData.get("image_id") ?? "");
  if (!listingId || !imageId) throw new Error("Missing listing_id or image_id");

  const supabase = getSupabaseAdmin();

  // Fetch storage_path first
  const { data: row, error: fetchErr } = await supabase
    .from("listing_images")
    .select("storage_path")
    .eq("id", imageId)
    .eq("listing_id", listingId)
    .single();

  if (fetchErr) throw new Error(fetchErr.message);

  const storagePath = (row as { storage_path: string | null }).storage_path;

  // Delete from Storage first (so DB doesn't lose the key)
  if (storagePath) {
    const { error: storageErr } = await supabase.storage
      .from(BUCKET)
      .remove([storagePath]);

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
 * Update alt text.
 * Input form fields:
 * - listing_id
 * - image_id
 * - alt
 */
export async function updateAltText(formData: FormData) {
  await requireAdminAuth();

  const listingId = String(formData.get("listing_id") ?? "");
  const imageId = String(formData.get("image_id") ?? "");
  const alt = String(formData.get("alt") ?? "").trim() || null;

  if (!listingId || !imageId) throw new Error("Missing listing_id or image_id");

  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("listing_images")
    .update({ alt })
    .eq("id", imageId)
    .eq("listing_id", listingId);

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/listings/${listingId}`);
}

/**
 * OPTIONAL (legacy): Move up/down buttons.
 * If you’ve implemented drag-and-drop + PATCH order persistence,
 * you can delete these two actions entirely.
 */
export async function moveImageUp(formData: FormData) {
  await requireAdminAuth();

  const listingId = String(formData.get("listing_id") ?? "");
  const imageId = String(formData.get("image_id") ?? "");
  if (!listingId || !imageId) throw new Error("Missing listing_id or image_id");

  const supabase = getSupabaseAdmin();

  const images = await fetchOrderedImages(supabase, listingId);

  // Do not move cover image via sort_order (cover ordering is controlled by is_cover)
  if (images.find((i) => i.id === imageId)?.is_cover) return;

  // Only reorder non-cover images
  const nonCover = images.filter((i) => !i.is_cover);
  const ids = nonCover.map((i) => i.id);
  const idx = ids.indexOf(imageId);
  if (idx <= 0) return;

  const swapped = [...ids];
  [swapped[idx - 1], swapped[idx]] = [swapped[idx], swapped[idx - 1]];

  await bulkSetSortOrder(supabase, listingId, swapped);
  revalidatePath(`/admin/listings/${listingId}`);
}

export async function moveImageDown(formData: FormData) {
  await requireAdminAuth();

  const listingId = String(formData.get("listing_id") ?? "");
  const imageId = String(formData.get("image_id") ?? "");
  if (!listingId || !imageId) throw new Error("Missing listing_id or image_id");

  const supabase = getSupabaseAdmin();

  const images = await fetchOrderedImages(supabase, listingId);

  // Do not move cover image via sort_order (cover ordering is controlled by is_cover)
  if (images.find((i) => i.id === imageId)?.is_cover) return;

  const nonCover = images.filter((i) => !i.is_cover);
  const ids = nonCover.map((i) => i.id);
  const idx = ids.indexOf(imageId);
  if (idx === -1 || idx >= ids.length - 1) return;

  const swapped = [...ids];
  [swapped[idx], swapped[idx + 1]] = [swapped[idx + 1], swapped[idx]];

  await bulkSetSortOrder(supabase, listingId, swapped);
  revalidatePath(`/admin/listings/${listingId}`);
}