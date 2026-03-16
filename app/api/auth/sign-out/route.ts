import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();

  // Also clear any helper cookies (like "role") if you set them
  const res = NextResponse.json({ ok: true });
  res.cookies.set("role", "", { path: "/", maxAge: 0 });
  return res;
}