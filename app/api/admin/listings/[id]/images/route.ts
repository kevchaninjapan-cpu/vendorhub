// app/api/admin/listings/[id]/images/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { requireAdmin } from "@/lib/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ✅ Your PUBLIC bucket (confirmed)
const BUCKET = "listing-photos";

// -----------------------------
// Helpers
// -----------------------------
function sanitizeFilename(name: string) {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "");
}

function parseBool(v: FormDataEntryValue | null) {
  const s = String(v ?? "").toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "on";
}

async function getSupabaseServer() {
  // ✅ Next.js 15/16 cookies() is async
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        // In route handlers we CAN set cookies (for auth refresh if needed)
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

// -----------------------------
// POST /api/admin/listings/:id/images
// multipart/form-data:
// - file (required)
// - alt (optional)
// - is_cover (optional: true/false)
// -----------------------------
export async function POST(
  req: Request,
  ctx: { params: { id: string } | Promise<{ id: string }> }
) {
  // 🔒 Admin only
  await requireAdmin();

  const { id: listingId } = await Promise.resolve(ctx.params);

  try {
    const form = await req.formData();

    const file = form.get("file");
    const alt = String(form.get("alt") ?? "").trim() || null;
    const isCover = parseBool(form.get("is_cover"));

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing file. Provide multipart form-data field 'file'." },
        { status: 400 }
      );
    }

    // Basic validation
    const maxBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: "File too large (max 10MB)." },
        { status: 413 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Invalid file type. Must be image/*." },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServer();

    // ✅ Storage key
    const safeName = sanitizeFilename(file.name || "image");
    const storagePath = `listings/${listingId}/${crypto.randomUUID()}-${safeName}`;

    // ✅ Upload to PUBLIC bucket listing-photos
    const upload = await supabase.storage.from(BUCKET).upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
      cacheControl: "3600",
    });

    if (upload.error) {
      return NextResponse.json({ error: upload.error.message }, { status: 500 });
    }

    // ✅ Determine next sort_order
    const { data: maxRow, error: maxErr } = await supabase
      .from("listing_images")
      .select("sort_order")
      .eq("listing_id", listingId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxErr) {
      return NextResponse.json({ error: maxErr.message }, { status: 500 });
    }

    const nextSortOrder = (maxRow?.sort_order ?? 0) + 1;

    // ✅ If is_cover=true, unset previous cover for this listing
    if (isCover) {
      const { error: unsetErr } = await supabase
        .from("listing_images")
        .update({ is_cover: false })
        .eq("listing_id", listingId)
        .eq("is_cover", true);

      if (unsetErr) {
        return NextResponse.json({ error: unsetErr.message }, { status: 500 });
      }
    }

    // ✅ Insert DB row into listing_images with storage_path
    const { data: inserted, error: insertErr } = await supabase
      .from("listing_images")
      .insert({
        listing_id: listingId,
        storage_path: storagePath,
        alt,
        sort_order: nextSortOrder,
        is_cover: isCover,
      })
      .select("id, listing_id, storage_path, alt, sort_order, is_cover, created_at")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // ✅ Return public URL for convenience (bucket listing-photos is public)
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    return NextResponse.json(
      {
        image: inserted,
        publicUrl: pub?.publicUrl ?? null,
      },
      { status: 201 }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
``