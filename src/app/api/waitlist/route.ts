// app/api/properties/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const supa = supabaseAdmin();
    const { data, error } = await supa
      .from("properties")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const title = String(body?.title || "").trim();
    const address = String(body?.address || "").trim();
    const price = body?.price !== undefined ? Number(body.price) : null;
    const status = body?.status === "published" ? "published" : "draft";

    if (!title) return NextResponse.json({ ok: false, error: "Title is required" }, { status: 400 });
    if (price !== null && Number.isNaN(price))
      return NextResponse.json({ ok: false, error: "Price must be numeric" }, { status: 400 });

    const supa = supabaseAdmin();
    const { data, error } = await supa
      .from("properties")
      .insert([{ title, address, price, status }])
      .select("*")
      .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}