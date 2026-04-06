// app/api/listings/create/route.ts
import { supabaseServer } from "@/lib/supabaseServer";

const DRAFT_STATUS = "draft"; // change if your enum uses a different value

export async function POST(request: Request) {
  try {
    const supabase = await supabaseServer();

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Optional body: { title?: string }
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const title =
      typeof body?.title === "string" && body.title.trim().length > 0
        ? body.title.trim()
        : "Untitled listing";

    const { data, error } = await supabase
      .from("listings")
      .insert({
        owner_id: userRes.user.id,
        status: DRAFT_STATUS as any,
        title,
      })
      .select("id")
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ id: data.id }, { status: 201 });
  } catch (e: any) {
    return Response.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}