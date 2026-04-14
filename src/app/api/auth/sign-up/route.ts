import { NextResponse, type NextRequest } from "next/server";
import supabaseServer from "../../../../lib/supabaseServer";

type SignUpBody = {
  email?: string;
  password?: string;
  redirectTo?: string; // relative path only
};

function baseUrl(req: NextRequest) {
  const env =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    "";
  if (env) {
    if (env.startsWith("http://") || env.startsWith("https://")) return env;
    return `https://${env}`;
  }
  return req.nextUrl?.origin || "http://localhost:3000";
}

function safeRelativePath(p?: string) {
  if (!p) return null;
  // Only allow internal relative paths
  if (!p.startsWith("/")) return null;
  if (p.startsWith("//")) return null;
  return p;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as SignUpBody;
    const email = body.email?.trim();
    const password = body.password;
    const redirectPath = safeRelativePath(body.redirectTo) || "/onboarding/details";

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    const supabase = await supabaseServer();

    // If your Supabase project requires email confirmation, this will send an email.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Where Supabase sends user after email confirmation (if enabled)
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/onboarding`
      },
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      );
    }

    // If session exists, user is signed in immediately → we can redirect now
    if (data?.session) {
      return NextResponse.json(
        { ok: true, redirectTo: redirectPath },
        { status: 200 }
      );
    }

    // Otherwise, likely email confirmation is required
    return NextResponse.json(
      {
        ok: true,
        message:
          "Account created. Please check your email to confirm, then continue onboarding.",
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[SIGN_UP_FATAL]", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}