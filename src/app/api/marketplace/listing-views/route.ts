import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimitResponse } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

// Views are recorded by the server only, for live listings only, rate limited.
//
// Signed-out visitors get a daily visitor code: a one-way hash of their
// internet address and today's date (NZ time). It changes every day, can't be
// reversed, uses no cookies, and only lets us count unique visitors.
// Only the referring website is kept (e.g. https://www.google.com), never the
// full address, which can contain search terms.

async function dailyVisitorCode(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "unknown";
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "Pacific/Auckland" });
  const salt = process.env.RATE_LIMIT_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "vendorhub";
  return createHash("sha256").update(`${salt}|views|${day}|${ip}`).digest("hex").slice(0, 32);
}

function referringSite(referer: string | null): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).origin.slice(0, 200);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const limited = await rateLimitResponse("listing-views");
  if (limited) return NextResponse.json({ ok: true });

  const body = await req.json().catch(() => null);
  const listingId = typeof body?.listingId === "string" ? body.listingId : "";
  if (!/^[0-9a-f-]{36}$/i.test(listingId)) return NextResponse.json({ ok: false });

  const { data: listing } = await supabaseAdmin
    .from("listings")
    .select("id, member_id")
    .eq("id", listingId)
    .in("status", ["live", "under_offer"])
    .maybeSingle();
  if (!listing) return NextResponse.json({ ok: false });

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sellers viewing their own listing don't count.
  if (user && (listing as { member_id: string }).member_id === user.id) {
    return NextResponse.json({ ok: true });
  }

  await supabaseAdmin.from("listing_views").insert({
    listing_id: listingId,
    viewer_id: user?.id ?? null,
    ip_hash: user ? null : await dailyVisitorCode(),
    referer: referringSite(req.headers.get("referer")),
  });

  return NextResponse.json({ ok: true });
}