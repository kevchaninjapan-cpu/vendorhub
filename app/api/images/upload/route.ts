import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

const BUCKET = "listing-images";

// Choose ONE of the URL helpers below:

// (A) PUBLIC bucket helper:
function publicUrlFromPath(
  supabase: ReturnType<typeof createServerClient<Database>>,
  path: string
) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// (B) PRIVATE bucket helper (recommended in prod):
async function signedUrlFromPath(
  supabase: ReturnType<typeof createServerClient<Database>>,
  path: string,
  expiresInSeconds = 60 * 10
) {
  const { data, error } = await supabase
    .storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}

export async function POST(req: Request) {
  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  // Auth
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Parse form data
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const listingId = (form.get("listingId") as string | null)?.trim() || null;

  if (!file || !listingId) {
    return NextResponse.json({ error: "Missing file or listingId" }, { status: 400 });
  }

  // Optional: verify the user actually owns the listing (fast guard before inserting)
  const { data: listing, error: listingErr } = await supabase
    .from("listings")
    .select("id, owner_id")
    .eq("id", listingId)
    .single();

  if (listingErr || listing?.owner_id !== user.id) {
    // Avoid leaking info: respond 404
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  // Build a unique storage path
  const safeName = file.name.replace(/[^\w\-.]+/g, "_");
  const storagePath = `${listingId}/${Date.now()}-${safeName}`;

  // Upload to Storage (RLS on storage.objects must allow this)
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 400 });
  }

  // Determine sort_order and is_cover
  const { count, error: countErr } = await supabase
    .from("listing_images")
    .select("*", { count: "exact", head: true })
    .eq("listing_id", listingId);

  if (countErr) {
    // Rollback: optional—delete uploaded file to keep storage tidy
    // await supabase.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ error: countErr.message }, { status: 400 });
  }

  const sort_order = (count ?? 0) + 1;
  const is_cover = (count ?? 0) === 0; // first image becomes cover

  // Insert DB row (RLS on listing_images must allow this)
  const { data: row, error: insertErr } = await supabase
    .from("listing_images")
    .insert({
      listing_id: listingId,
      storage_path: storagePath,
      sort_order,
      is_cover,
      alt: null,
    } satisfies Database["public"]["Tables"]["listing_images"]["Insert"])
    .select("*")
    .single();

  if (insertErr) {
    // Optional rollback of the storage upload
    // await supabase.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ error: insertErr.message }, { status: 400 });
  }

  // Create URL to return to client
  // If PUBLIC bucket:
  const url = publicUrlFromPath(supabase, storagePath);

  // If PRIVATE bucket, use:
  // const url = await signedUrlFromPath(supabase, storagePath);

  return NextResponse.json({
    image: {
      id: row.id,
      url,
      storage_path: storagePath,
      is_cover,
      sort_order,
    },
  });
}