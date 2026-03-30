import { NextResponse, type NextRequest } from "next/server";
import supabaseServer from "../../../../lib/supabaseServer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password, otpType } = body as {
      email?: string;
      password?: string;
      otpType?: "magic_link";
    };

    // ✅ Now uses shared helper
    const supabase = await supabaseServer();

    if (email && password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 401 });
      }

      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (email && otpType === "magic_link") {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${
            process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
          }/dashboard`,
        },
      });

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }

      return NextResponse.json({ ok: true, message: "Magic link sent." }, { status: 200 });
    }

    return NextResponse.json({ ok: false, error: "Invalid payload." }, { status: 400 });
  } catch (err: any) {
    console.error("[SIGN_IN_FATAL]", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}