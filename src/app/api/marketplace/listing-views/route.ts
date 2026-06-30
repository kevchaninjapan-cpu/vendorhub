import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();
  if (!body?.listingId) return NextResponse.json({ ok: false });

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from("listing_views").insert({
    listing_id: body.listingId,
    viewer_id: user?.id ?? null,
    referer: req.headers.get("referer"),
  });
  return NextResponse.json({ ok: true });
}