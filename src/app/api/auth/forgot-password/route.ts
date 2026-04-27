import { NextResponse, type NextRequest } from "next/server";
import supabaseServer from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { email?: string };
    const email = body.email?.trim();

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Email is required." },
        { status: 400 }
      );
    }

    const supabase = await supabaseServer();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // ✅ Uses env var so it works on both localhost and Vercel
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/signin/reset-password`,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      );
    }

    // ✅ Always return ok:true even if email doesn't exist
    // This prevents user enumeration attacks
    return NextResponse.json({ ok: true }, { status: 200 });

  } catch (err: any) {
    console.error("[FORGOT_PASSWORD_FATAL]", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}