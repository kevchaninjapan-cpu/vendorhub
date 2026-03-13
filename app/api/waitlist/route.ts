import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email } = await req.json();

  // VERY basic validation
  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false });
  }

  // For now, just log it.
  // Later you'll store this in Supabase.
  console.log("New waitlist signup:", email);

  return NextResponse.json({ ok: true });
}
