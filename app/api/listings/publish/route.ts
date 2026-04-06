// app/api/listings/publish/route.ts
import { supabaseServer } from "@/lib/supabaseServer";

const DRAFT_STATUS = "draft";
const PUBLISHED_STATUS = "active"; // ⚠️ change to "published" if that's your enum value

export async function POST(request: Request) {
  try {
    const supabase = await supabaseServer();

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const id = body?.id as string;

    if (!id || typeof id !== "string") {
      return Response.json({ error: "Missing id" }, { status: 400 });
    }

    // Fetch the draft row (RLS ensures user can only see their own unless admin)
    const { data: listing, error: fetchErr } = await supabase
      .from("listings")
      .select(
        "id, title, status, price_numeric, property_type, address_line1, suburb, city, region, postcode"
      )
      .eq("id", id)
      .single();

    if (fetchErr || !listing) {
      return Response.json(
        { error: fetchErr?.message ?? "Not found" },
        { status: 404 }
      );
    }

    if ((listing as any).status !== DRAFT_STATUS) {
      return Response.json(
        { error: "Only draft listings can be published" },
        { status: 400 }
      );
    }

    // Minimal publish validation — tighten as you like
    const missing: string[] = [];
    if (!listing.title || listing.title.trim().length === 0) missing.push("title");

    // Uncomment these if you want them required at publish-time:
    // if (!listing.property_type) missing.push("property_type");
    // if (listing.price_numeric == null) missing.push("price_numeric");
    // if (!listing.address_line1) missing.push("address_line1");
    // if (!listing.city) missing.push("city");
    // if (!listing.region) missing.push("region");

    if (missing.length > 0) {
      return Response.json(
        { error: "Missing required fields", missing },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from("listings")
      .update({
        status: PUBLISHED_STATUS as any,
        published_at: now,
        updated_at: now,
      })
      .eq("id", id)
      .eq("status", DRAFT_STATUS as any);

    if (updateErr) {
      return Response.json({ error: updateErr.message }, { status: 400 });
    }

    return Response.json({ ok: true, id });
  } catch (e: any) {
    return Response.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
