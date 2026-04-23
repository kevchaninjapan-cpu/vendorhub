import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import supabaseServer from "../../../../lib/supabaseServer";

type SignUpBody = {
  email?: string;
  password?: string;
  redirectTo?: string;
};

function safeRelativePath(p?: string) {
  if (!p) return null;
  if (!p.startsWith("/")) return null;
  if (p.startsWith("//")) return null;
  return p;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as SignUpBody;
    const email = body.email?.trim();
    const password = body.password;
    const redirectPath =
      safeRelativePath(body.redirectTo) || "/onboarding/details";

    console.log("[SIGN_UP] Starting signup for:", email);

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    const admin = supabaseAdmin();

    // Step 1: Create user via admin — fully commits to auth.users
    console.log("[SIGN_UP] Calling admin.auth.admin.createUser...");
    const { data: createdUser, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    console.log("[SIGN_UP] createUser result:", JSON.stringify({
      userId: createdUser?.user?.id ?? null,
      error: createError ? {
        message: createError.message,
        status: createError.status,
        name: createError.name,
      } : null,
    }, null, 2));

    if (createError) {
      return NextResponse.json(
        { ok: false, error: createError.message },
        { status: 400 }
      );
    }

    const userId = createdUser?.user?.id;

    if (!userId) {
      console.error("[SIGN_UP] No userId returned from createUser");
      return NextResponse.json(
        { ok: false, error: "User creation returned no ID." },
        { status: 500 }
      );
    }

    console.log("[SIGN_UP] User created successfully:", userId);

    // Step 2: Insert profile row using admin client
    console.log("[SIGN_UP] Inserting onboarding_profiles row...");
    const { error: profileError } = await admin
      .from("onboarding_profiles")
      .upsert(
        {
          user_id: userId,
          official_email: email,
          verification_status: "not_started",
        },
        { onConflict: "user_id" }
      );

    if (profileError) {
      console.error("[SIGN_UP] Profile insert failed:", JSON.stringify({
        message: profileError.message,
        code: profileError.code,
        details: profileError.details,
        hint: profileError.hint,
      }, null, 2));

      return NextResponse.json(
        {
          ok: false,
          error: "Account created but profile setup failed. Please contact support.",
        },
        { status: 500 }
      );
    }

    console.log("[SIGN_UP] Profile created successfully for:", userId);

    // ✅ Step 3: Sign in using supabaseServer — this sets the session cookie
    console.log("[SIGN_UP] Signing in with supabaseServer to set cookie...");
    const supabase = await supabaseServer();
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    console.log("[SIGN_UP] signIn result:", JSON.stringify({
      hasSession: !!signInData?.session,
      error: signInError?.message ?? null,
    }, null, 2));

    if (signInError || !signInData?.session) {
      // Account + profile created but session failed — ask to sign in manually
      return NextResponse.json(
        {
          ok: true,
          message: "Account created! Please sign in to continue onboarding.",
        },
        { status: 200 }
      );
    }

    // ✅ Cookie is set — redirect will work end-to-end
    return NextResponse.json(
      { ok: true, redirectTo: redirectPath },
      { status: 200 }
    );

  } catch (err: any) {
    console.error("[SIGN_UP_FATAL] Full error:", JSON.stringify({
      message: err?.message,
      stack: err?.stack,
      name: err?.name,
    }, null, 2));

    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}