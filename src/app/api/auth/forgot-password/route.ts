import { NextResponse, type NextRequest } from "next/server";
import supabaseServer from "@/lib/supabaseServer";
import { rateLimitResponse } from "@/lib/security/rate-limit";

// Sends a password reset email. Always answers the same way whether or not
// the email has an account, so the form can't be used to find out who's
// signed up. Rate limited so it can't be used to flood someone's inbox.
export async function POST(req: NextRequest) {
  const limited = await rateLimitResponse("auth-forgot");
  if (limited) return limited;

  try {
    const body = (await req.json().catch(() => ({}))) as { email?: string };
    const email = body.email?.trim();
    if (!email) {
      return NextResponse.json({ ok: false, error: "Email is required." }, { status: 400 });
    }

    const site = (process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).replace(/\/$/, "");
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${site}/signin/reset-password`,
    });
    if (error) console.error("[FORGOT_PASSWORD]", error.message);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[FORGOT_PASSWORD]", err);
    return NextResponse.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}