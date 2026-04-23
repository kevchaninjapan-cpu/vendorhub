import { NextResponse, type NextRequest } from "next/server";
import supabaseServer from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer();

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
    }

    const { doc_type, file_path, mime_type, size_bytes } = await req.json();

    if (!doc_type || !file_path) {
      return NextResponse.json({ ok: false, error: "Missing fields." }, { status: 400 });
    }

    // ✅ Admin client bypasses RLS
    const admin = supabaseAdmin();

    const { error } = await admin
      .from("verification_documents")
      .upsert(
        {
          user_id: user.id,
          doc_type,
          file_path,
          mime_type: mime_type ?? "application/octet-stream",
          size_bytes: size_bytes ?? 0,
          status: "uploaded",
        },
        { onConflict: "user_id,doc_type" }
      );

    if (error) {
      console.error("[DOCS_UPSERT] Failed:", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Unexpected error" }, { status: 500 });
  }
}