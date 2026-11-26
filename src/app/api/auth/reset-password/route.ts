import { NextResponse, type NextRequest } from "next/server";
import supabaseServer from "@/lib/supabaseServer";
import { rateLimitResponse } from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  const limited = await rateLimitResponse("auth-reset");
  if (limited) return limited;

  try {
    const body = (await req.json().catch(() => ({}))) as { password?: string };
    const password = body.password;

    if (!password || password.length < 8) {
      return NextResponse.json({ ok: false, error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const supabase = await supabaseServer();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return NextResponse.json(
        { ok: false, error: "Your reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[RESET_PASSWORD]", err);
    return NextResponse.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}