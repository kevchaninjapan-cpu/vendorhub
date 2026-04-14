import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// IMPORTANT: Use your existing server-session helper to get the logged-in user.
// If you already have a supabaseServer() helper (like in your /api/auth routes),
// import and use it here.
import supabaseServer from "@/lib/supabaseServer";

type Body = {
  docType: "government_id" | "proof_of_residence" | "address_proof";
  filename: string;           // original filename from browser
  upsert?: boolean;           // optional: allow overwrite
};

function safeName(name: string) {
  // Basic filename sanitization (keeps letters/numbers/._-)
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<Body>;
    const docType = body.docType;
    const filename = body.filename ? safeName(body.filename) : null;
    const upsert = !!body.upsert;

    if (!docType || !filename) {
      return NextResponse.json(
        { ok: false, error: "docType and filename are required." },
        { status: 400 }
      );
    }

    // 1) Identify the current user from cookies/session
    const sb = await supabaseServer();
    const { data: userData, error: userErr } = await sb.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated." },
        { status: 401 }
      );
    }

    const userId = userData.user.id;
    const bucket = process.env.SUPABASE_VERIFICATION_BUCKET || "verification-documents";

    // 2) Build a deterministic storage path under the user’s folder
    //    e.g. <userId>/government_id/<uuid>-passport.png
    const objectName = `${userId}/${docType}/${crypto.randomUUID()}-${filename}`;

    // 3) Create signed upload URL (valid for ~2 hours)
    //    Supabase: createSignedUploadUrl creates a signed upload URL/token. [1](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl)[2](https://deepwiki.com/supabase/supabase-js/6.5-signed-urls)
    const admin = supabaseAdmin();
    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUploadUrl(objectName, { upsert });

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: error?.message ?? "Could not create signed upload URL." },
        { status: 400 }
      );
    }

    // data typically includes: signedUrl + token
    return NextResponse.json(
      {
        ok: true,
        bucket,
        path: objectName,
        token: (data as any).token,
        signedUrl: (data as any).signedUrl,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[CREATE_SIGNED_UPLOAD_FATAL]", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}