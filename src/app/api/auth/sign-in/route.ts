import { NextResponse, type NextRequest } from "next/server";
import supabaseServer from "@/lib/supabaseServer";
import { rateLimitResponse } from "@/lib/security/rate-limit";

// Password sign-in. Rate limited per visitor to slow down password guessing.
export async function POST(req: NextRequest) {
  const limited = await rateLimitResponse("auth-sign-in");
  if (limited) return limited;

  try {
    const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
    const email = body.email?.trim();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "Enter your email and password." }, { status: 400 });
    }

    const supabase = await supabaseServer();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return NextResponse.json({ ok: false, error: "That email and password don't match." }, { status: 401 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[SIGN_IN]", err);
    return NextResponse.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}