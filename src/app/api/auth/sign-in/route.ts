import { NextResponse, type NextRequest } from "next/server";
import supabaseServer from "@/lib/supabaseServer";

type SignInBody = {
  email?: string;
  password?: string;
  otpType?: "magic_link";
};

function baseUrl(req: NextRequest) {
  // Prefer explicit site URL, then request origin, then localhost
  const env =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    "";
  if (env) {
    // NEXT_PUBLIC_VERCEL_URL may be like "myapp.vercel.app" (no scheme)
    if (env.startsWith("http://") || env.startsWith("https://")) return env;
    return `https://${env}`;
  }

  const origin = req.nextUrl?.origin;
  return origin || "http://localhost:3000";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as SignInBody;
    const email = body.email?.trim();
    const password = body.password;
    const otpType = body.otpType;

    // ✅ Uses your shared helper
    const supabase = await supabaseServer();

    // Password sign-in
    if (email && password) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 401 }
        );
      }

      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Magic link sign-in
    if (email && otpType === "magic_link") {
      const redirectTo = `${baseUrl(req)}/app`; // ✅ VendorHub app area (not /dashboard)

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });

      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { ok: true, message: "Magic link sent." },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Invalid payload." },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[SIGN_IN_FATAL]", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}