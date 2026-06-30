import { NextResponse, type NextRequest } from "next/server";
import supabaseServer from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ProfileUpdate = {
  full_name?: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  country?: string;
  date_of_birth?: string;
};

const ALLOWED_KEYS: (keyof ProfileUpdate)[] = [
  "full_name",
  "email",
  "phone",
  "address_line1",
  "address_line2",
  "city",
  "country",
  "date_of_birth",
];

// ── GET ─ load profile for the current user ─────────────────────────────
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
type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  country: string | null;
  date_of_birth: string | null;
  role: string | null;
  is_admin: boolean | null;
  onboarding_status: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

const { data: rawProfile, error } = await admin
  .from("profiles")
  .select(
    "id, email, full_name, phone, address_line1, address_line2, " +
    "city, country, date_of_birth, role, is_admin, onboarding_status, " +
    "submitted_at, created_at, updated_at"
  )
  .eq("id", user.id)
  .maybeSingle<ProfileRow>();

const profile = rawProfile;

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    // Map to the legacy response shape so existing callers don't break.
    return NextResponse.json({
      ok: true,
      profile: profile
        ? {
            id: profile.id,
            user_id: profile.id, // legacy alias
            full_name: profile.full_name,
            official_email: profile.email,
            business_phone: profile.phone,
            address_line1: profile.address_line1,
            address_line2: profile.address_line2,
            city: profile.city,
            postcode: null, // not in current schema
            country: profile.country,
            date_of_birth: profile.date_of_birth,
            verification_status: profile.onboarding_status ?? "not_started",
            role: profile.role,
            is_admin: profile.is_admin,
            submitted_at: profile.submitted_at,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
          }
        : null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}

// ── PATCH ─ update the current user's profile ───────────────────────────
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

    // Translate legacy aliases the UI may still send
    const aliasMap: Record<string, keyof ProfileUpdate> = {
      official_email: "email",
      business_phone: "phone",
    };

    const update: ProfileUpdate = {};
    for (const [k, v] of Object.entries(body)) {
      if (typeof v !== "string") continue;
      const key = (aliasMap[k] ?? k) as keyof ProfileUpdate;
      if (ALLOWED_KEYS.includes(key)) {
        update[key] = v;
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { ok: false, error: "No valid fields to update." },
        { status: 400 }
      );
    }

    const admin = supabaseAdmin();

    // Upsert against the user's id (single row per user).
    const { error } = await admin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email,
          ...update,
        },
        { onConflict: "id" }
      );

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