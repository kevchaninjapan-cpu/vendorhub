// app/api/listings/[id]/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/guards";
import { updateListing, softDeleteListing } from "@/lib/db/listings";
import { cookies as nextCookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * GET /api/listings/[id]
 * - Public can read only ACTIVE listings
 * - Owners/Admins can read any (RLS will allow when authenticated)
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  // In your Next version, cookies() returns a Promise → must await
  const cookieStore = await nextCookies();

  // Create a Supabase server client using @supabase/ssr and the request cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // Route Handlers can't mutate response cookies here easily; for GET we only need read
        set() {},
        remove() {},
      },
    }
  );

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: error?.message ?? "Not found" }, { status: 404 });
  }

  // If user is not authenticated and listing is not active → hide
  // Note: adjust the cookie name check to your auth cookie—this is a coarse signal only.
  const isAuthed =
    Boolean(cookieStore.get("sb-access-token")?.value) ||
    Boolean(cookieStore.get("sb:token")?.value) ||
    Boolean(cookieStore.get("supabase-auth-token")?.value);

  if (!isAuthed && data.status !== "active") {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, listing: data });
}

/**
 * PATCH /api/listings/[id]
 * Requires auth. RLS ensures only owner/admin can update.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  await requireUser();
  const patch = await req.json();
  try {
    const updated = await updateListing(params.id, patch);
    return NextResponse.json({ ok: true, listing: updated });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}

/**
 * DELETE /api/listings/[id]
 * Requires auth. We soft-delete the listing.
 */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await requireUser();
  try {
    await softDeleteListing(params.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}