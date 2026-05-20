import { NextResponse, type NextRequest } from "next/server";
import supabaseServer from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ProfileUpdate = {
  full_name?: string;
  official_email?: string;
  business_phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  postcode?: string;
  country?: string;
};

const ALLOWED_KEYS: (keyof ProfileUpdate)[] = [
  "full_name",
  "official_email",
  "business_phone",
  "address_line1",
  "address_line2",
  "city",
  "postcode",
  "country",
];

// ── GET ─ load latest profile for the current user
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

    return NextResponse.json({ ok: true, profile: profiles?.[0] ?? null });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}

// ── PATCH ─ update existing profile OR insert a new one if none exists
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

    // 1. Check if a profile already exists for this user
    const { data: existing, error: selErr } = await admin
      .from("onboarding_profiles")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selErr) {
      return NextResponse.json(
        { ok: false, error: selErr.message },
        { status: 500 }
      );
    }

    if (existing?.id) {
      // 2a. Existing row → update it
      const { error } = await admin
        .from("onboarding_profiles")
        .update(update)
        .eq("id", existing.id);

      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 }
        );
      }
    } else {
      // 2b. No row yet → insert a fresh one
      const insertPayload = {
        user_id: user.id,
        official_email: update.official_email ?? user.email ?? null,
        verification_status: "not_started",
        ...update,
      };

      const { error } = await admin
        .from("onboarding_profiles")
        .insert(insertPayload);

      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}