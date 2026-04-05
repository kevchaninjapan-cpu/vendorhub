import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ListingImageRow = {
  id: string;
  listing_id: string;
  storage_path: string;
  alt: string | null;
  sort_order: number | null;
  is_cover: boolean | null;
  created_at: string | null;
};

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)");
  if (!serviceRole) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceRole, {
    auth: { persistSession: false },
  });
}

function assertAdmin(req: Request) {
  // Optional: if you set ADMIN_SECRET, require the header.
  // If you don’t use this, leave ADMIN_SECRET unset and it won’t block anything.
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return;

  const header = req.headers.get("x-admin-secret");
  if (header !== secret) {
    throw new Error("Unauthorized");
  }
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function guessExt(file: File) {
  const byType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/heic": "heic",
    "image/heif": "heif",
    "image/avif": "avif",
  };
  if (byType[file.type]) return byType[file.type];

  const name = file.name || "";
  const idx = name.lastIndexOf(".");
  if (idx > -1 && idx < name.length - 1) return name.slice(idx + 1).toLowerCase();

  return "jpg";
}

function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * GET /api/admin/listings/:id/images
 * Returns images for listing with publicUrl for convenience (works if bucket is public).
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    assertAdmin(req);

    const listingId = params.id;
    if (!listingId || !isUuid(listingId)) return jsonError("Invalid listing id", 400);

    const supabase = supabaseAdmin();

    const { data, error } = await supabase
      .from("listing_images")
      .select("*")
      .eq("listing_id", listingId)
      // Cover first, then explicit order, then creation time.
      .order("is_cover", { ascending: false })
      .order("sort_order", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true });

    if (error) return jsonError(error.message, 500);

    const images = (data as ListingImageRow[]).map((img) => {
      const { data: urlData } = supabase.storage
        .from("listing-photos")
        .getPublicUrl(img.storage_path);

      return {
        ...img,
        publicUrl: urlData?.publicUrl ?? null,
      };
    });

    return NextResponse.json({ images });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status = msg === "Unauthorized" ? 401 : 500;
    return jsonError(msg, status);
  }
}

/**
 * POST /api/admin/listings/:id/images
 * Expects multipart/form-data with:
 * - file: File
 * - alt: string (optional)
 * - is_cover: "true" | "false" (optional)
 *
 * Uploads to storage bucket listing-photos, then inserts row into listing_images.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    assertAdmin(req);

    const listingId = params.id;
    if (!listingId || !isUuid(listingId)) return jsonError("Invalid listing id", 400);

    const supabase = supabaseAdmin();

    const form = await req.formData();
    const file = form.get("file");
    const altRaw = form.get("alt");
    const isCoverRaw = form.get("is_cover");

    if (!file || !(file instanceof File)) return jsonError("Missing file", 400);

    const alt =
      typeof altRaw === "string" && altRaw.trim().length > 0 ? altRaw.trim() : null;

    const is_cover = isCoverRaw === "true";

    // Basic validation (optional, but sensible)
    if (!file.type.startsWith("image/")) return jsonError("Only image uploads are allowed", 400);
    const maxMb = 12;
    if (file.size > maxMb * 1024 * 1024) return jsonError(`Max file size is ${maxMb}MB`, 400);

    // Storage path: <listingId>/<uuid>.<ext>
    const ext = guessExt(file);
    const filename = `${crypto.randomUUID()}.${ext}`;
    const storage_path = `${listingId}/${filename}`;

    // Upload (convert to Buffer to be safe in Node)
    const buffer = Buffer.from(await file.arrayBuffer());

    const upload = await supabase.storage
      .from("listing-photos")
      .upload(storage_path, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (upload.error) {
      return jsonError(`Storage upload failed: ${upload.error.message}`, 500);
    }

    // If marking as cover, unset existing cover images first.
    if (is_cover) {
      await supabase
        .from("listing_images")
        .update({ is_cover: false })
        .eq("listing_id", listingId);
    }

    // Insert DB row
    const insert = await supabase
      .from("listing_images")
      .insert({
        listing_id: listingId,
        storage_path,
        alt,
        sort_order: null,
        is_cover,
      })
      .select("*")
      .single();

    if (insert.error) {
      // If DB insert fails, you may want to delete the uploaded file to avoid orphaned objects.
      // Best-effort cleanup:
      await supabase.storage.from("listing-photos").remove([storage_path]);
      return jsonError(`DB insert failed: ${insert.error.message}`, 500);
    }

    // Public URL (works only if bucket is public)
    const { data: urlData } = supabase.storage
      .from("listing-photos")
      .getPublicUrl(storage_path);

    return NextResponse.json({
      image: insert.data as ListingImageRow,
      publicUrl: urlData?.publicUrl ?? null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status = msg === "Unauthorized" ? 401 : 500;
    return jsonError(msg, status);
  }
}

/**
 * PATCH /api/admin/listings/:id/images
 * JSON body supports:
 * - { order: string[] }             // list of image ids in desired order
 * - { coverImageId: string }        // set one cover image id
 * - { order: [...], coverImageId }  // both at once
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    assertAdmin(req);

    const listingId = params.id;
    if (!listingId || !isUuid(listingId)) return jsonError("Invalid listing id", 400);

    const supabase = supabaseAdmin();
    const body = await req.json().catch(() => ({}));

    // Reorder
    if (Array.isArray(body.order)) {
      const ids: string[] = body.order;

      // Update sort_order based on array position
      const updates = ids.map((id, index) => ({
        id,
        listing_id: listingId, // helps ensure we're not accidentally touching another listing
        sort_order: index,
      }));

      const { error } = await supabase
        .from("listing_images")
        .upsert(updates, { onConflict: "id" });

      if (error) return jsonError(`Reorder failed: ${error.message}`, 500);
    }

    // Set cover
    if (typeof body.coverImageId === "string") {
      const coverId = body.coverImageId;

      // Unset covers for this listing
      const unset = await supabase
        .from("listing_images")
        .update({ is_cover: false })
        .eq("listing_id", listingId);

      if (unset.error) return jsonError(`Cover update failed: ${unset.error.message}`, 500);

      // Set the selected cover (and ensure it belongs to the listing)
      const set = await supabase
        .from("listing_images")
        .update({ is_cover: true })
        .eq("id", coverId)
        .eq("listing_id", listingId);

      if (set.error) return jsonError(`Cover update failed: ${set.error.message}`, 500);
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status = msg === "Unauthorized" ? 401 : 500;
    return jsonError(msg, status);
  }
}
``