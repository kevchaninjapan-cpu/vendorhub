import { rateLimitResponse } from "@/lib/security/rate-limit";
import { NextResponse } from "next/server";
import { searchListings } from "@/lib/marketplace/queries";
import { searchParamsToFilters } from "@/lib/marketplace/url";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const __vhLimited = await rateLimitResponse("marketplace-search");
  if (__vhLimited) return __vhLimited;
  const url = new URL(req.url);
  const filters = searchParamsToFilters(url.searchParams);
  try {
    const data = await searchListings(filters);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}