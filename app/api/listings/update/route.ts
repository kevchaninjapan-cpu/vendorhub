// app/api/listings/update/route.ts
import { supabaseServer } from "@/lib/supabaseServer";

const DRAFT_STATUS = "draft"; // change if needed

// ✅ Only allow these fields to be updated from the wizard
const ALLOWED_PATCH_FIELDS = new Set([
  "title",
  "description",
  "price_numeric",
  "price_display",
  "property_type",
  "bedrooms",
  "bathrooms",
  "car_spaces",
  "floor_area_m2",
  "land_area_m2",
  "year_built",
  "address_line1",
  "address_line2",
  "suburb",
  "city",
  "region",
  "postcode",
  "latitude",
  "longitude",
  "slug",
  "expires_at",
]);

export async function PATCH(request: Request) {
  try {
    const supabase = await supabaseServer();

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const id = body?.id as string;
    const patch = body?.patch as Record<string, unknown>;

    if (!id || typeof id !== "string") {
      return Response.json({ error: "Missing id" }, { status: 400 });
    }
    if (!patch || typeof patch !== "object") {
      return Response.json({ error: "Missing patch object" }, { status: 400 });
    }

    // Build safe update object
    const update: Record<string, any> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (ALLOWED_PATCH_FIELDS.has(k)) update[k] = v;
    }

    // Always bump updated_at server-side
    update.updated_at = new Date().toISOString();

    // No valid fields? no-op
    if (Object.keys(update).length === 1) {
      return Response.json({ ok: true, noop: true });
    }

    // Update only drafts (prevents wizard editing published rows)
    const { error } = await supabase
      .from("listings")
      .update(update)
      .eq("id", id)
      .eq("status", DRAFT_STATUS as any);

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
