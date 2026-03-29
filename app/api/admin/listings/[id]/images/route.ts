import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/route";
import { isAdminUser } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

// Mirror the “hardened” pattern from your upload route:
// - auth + admin gate
// - listing existence check
// - status guard
// - strong error handling + consistent logs
// - returns useful JSON payload

export async function POST(
  _req: Request,
  { params }: { params: { id: string } } // ✅ NOT a Promise
) {
  const listingId = params.id;

  const supabase = await createRouteHandlerClient();

  // Auth + Admin gate (same pattern as your upload route)
  const { data, error: authErr } = await supabase.auth.getUser();
  if (authErr) console.error("[API_RESTORE_AUTH_ERROR]", authErr);

  const user = data?.user;
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Ensure listing exists and read current status (prevents nonsense updates)
  const { data: listing, error: readErr } = await supabase
    .from("listings")
    .select("id, status")
    .eq("id", listingId)
    .maybeSingle();

  if (readErr) {
    console.error("[API_RESTORE_READ_ERROR]", readErr);
    return NextResponse.json({ error: "Unable to read listing" }, { status: 500 });
  }
  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only archived listings can be restored (guard)
  if (listing.status !== "archived") {
    return NextResponse.json(
      { error: "Only archived listings can be restored" },
      { status: 400 }
    );
  }

  // Update + return the updated row (more useful than {ok:true} only)
  const { data: updated, error: updErr } = await supabase
    .from("listings")
    .update({ status: "draft" })
    .eq("id", listingId)
    .select("id, status, updated_at")
    .single();

  if (updErr) {
    console.error("[API_RESTORE_UPDATE_ERROR]", updErr);
    return NextResponse.json({ error: "Unable to restore listing" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    listing: updated,
    from: listing.status,
    to: "draft",
  });
}
