import { NextResponse, type NextRequest } from "next/server";
import supabaseServer from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ProfileUpdate = {
  full_name?: string;
  business_phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  postcode?: string;
  country?: string;
};

const ALLOWED_KEYS: (keyof ProfileUpdate)[] = [
  "full_name",
  "business_phone",
  "address_line1",
  "address_line2",
  "city",
  "postcode",
  "country",
];

// ✅ GET — load profile for the current user
export async function GET() {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated." },
        { status: 401 }
      );
    }

    const admin = supabaseAdmin();
    const { data: profiles, error } = await admin
      .from("onboarding_profiles")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const profile = profiles?.[0] ?? null;

    return NextResponse.json({ ok: true, profile });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}

// ✅ PATCH — update profile for the current user
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const update: ProfileUpdate = {};
    for (const key of ALLOWED_KEYS) {
      if (key in body && typeof body[key] === "string") {
        update[key] = body[key];
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { ok: false, error: "No valid fields to update." },
        { status: 400 }
      );
    }

    const admin = supabaseAdmin();
    const { error } = await admin
      .from("onboarding_profiles")
      .update(update)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}