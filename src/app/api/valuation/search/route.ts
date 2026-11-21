import { rateLimitResponse } from "@/lib/security/rate-limit";
import { NextResponse } from "next/server";
import { searchAddresses } from "@/lib/valuation/addressResolver";

export async function GET(req: Request) {
  const __vhLimited = await rateLimitResponse("valuation-search");
  if (__vhLimited) return __vhLimited;
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "10"), 20);

  if (q.trim().length < 3) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchAddresses(q, limit);
  return NextResponse.json({ results });
}