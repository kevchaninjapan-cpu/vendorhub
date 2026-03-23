// app/api/listings/create/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

// Optional local fallback in case RPC slugify fails
function fallbackSlugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// CORS (only if you plan to call this from the browser directly)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(req: Request) {
  // If you need CORS in dev only, keep these headers; otherwise you can drop them.
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Next.js 15: cookies() can be awaited in server contexts
  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
      },
    }
  );

  // 1) Auth
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401, headers: corsHeaders });
  }

  // 2) Parse/validate body (be defensive)
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: corsHeaders });
  }

  // Required
  const title: string | null = (body.title ?? "").toString().trim() || null;
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400, headers: corsHeaders });
  }

  // Simple number helper (handles empty strings, commas, spaces)
  const toNum = (v: unknown) =>
    typeof v === "string" && v.trim().length
      ? Number(v.replace(/[, ]/g, ""))
      : typeof v === "number"
      ? v
      : null;

  // 3) Pull fields that match your schema
  const payload: Database["public"]["Tables"]["listings"]["Insert"] = {
    title,
    owner_id: user.id, // ✅ critical for RLS
    address_line1: body.address_line1 ?? null,
    address_line2: body.address_line2 ?? null,
    suburb: body.suburb ?? null,
    city: body.city ?? null,
    region: body.region ?? null,
    postcode: body.postcode ?? null,
    description: body.description ?? null,

    // Numbers
    price: toNum(body.price),
    price_numeric: toNum(body.price_numeric) ?? toNum(body.price),
    floor_area_m2: toNum(body.floor_area_m2),
    land_area_m2: toNum(body.land_area_m2),
    year_built: toNum(body.year_built),
    bedrooms: toNum(body.bedrooms),
    bathrooms: toNum(body.bathrooms),
    car_spaces: toNum(body.car_spaces),

    // Enums (use defaults if omitted)
    property_type: (body.property_type ??
      "house") as Database["public"]["Enums"]["property_type"],
    status: (body.status ?? "draft") as Database["public"]["Enums"]["listing_status"],

    // Optional pretty display
    price_display:
      typeof body.price_display === "string" && body.price_display.trim().length
        ? body.price_display.trim()
        : null,
  };

  // 4) Slug via RPC (optional — remove if you have a DB trigger)
  try {
    const { data: slugData, error: slugErr } = await supabase.rpc("slugify", {
      input: title,
    });
    payload.slug = slugErr ? fallbackSlugify(title) : slugData ?? fallbackSlugify(title);
  } catch {
    payload.slug = fallbackSlugify(title);
  }

  // 5) Insert
  const { data, error } = await supabase
    .from("listings")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400, headers: corsHeaders });
  }

  return NextResponse.json({ id: data.id }, { status: 201, headers: corsHeaders });
}