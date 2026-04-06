// app/admin/listings/[id]/images/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await supabaseServer();

    // Require auth for admin route (RLS may already block, but this gives a clean 401)
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const listingId = params.id;

    // Fetch images for this listing.
    // Assumes you have a table like `listing_images` with these columns:
    // id, listing_id, url, sort_order, is_cover, created_at
    //
    // If your column names differ, adjust the select/order lines.
    const { data, error } = await supabase
      .from("listing_images")
      .select("id, listing_id, url, sort_order, is_cover, created_at")
      .eq("listing_id", listingId)
      .order("is_cover", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      // If RLS blocks access, Supabase often returns a 401/403-like error message.
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ images: data ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
``