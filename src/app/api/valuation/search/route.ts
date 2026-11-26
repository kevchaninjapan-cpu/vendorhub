import { NextResponse } from "next/server";
import { rateLimitResponse } from "@/lib/security/rate-limit";
import { searchAddresses } from "@/lib/valuation/addressResolver";

// Address suggestions for the valuation search box.
//
// Anti-copying limits: at most MAX_RESULTS suggestions per request (the pages
// already ask for 8), a length cap on the search text, and search text is
// stripped of characters that act as wildcards or database filter syntax.
// The per-visitor rate limit lives in lib/security/rate-limit.ts.

const MAX_RESULTS = 8;
const MAX_QUERY = 100;

function clean(value: string): string {
  return value
    .replace(/[%_\\,()*"`;:<>{}\[\]|&?!@#$^=+~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(req: Request) {
  const limited = await rateLimitResponse("valuation-search");
  if (limited) return limited;

  const url = new URL(req.url);
  const q = clean((url.searchParams.get("q") ?? "").slice(0, MAX_QUERY));
  if (q.length < 3) {
    return NextResponse.json({ results: [] });
  }

  let limit = Number(url.searchParams.get("limit"));
  if (!Number.isFinite(limit)) limit = MAX_RESULTS;
  limit = Math.min(MAX_RESULTS, Math.max(1, Math.floor(limit)));

  try {
    const results = await searchAddresses(q, limit);
    // Capital values are shown only after a property is chosen (in the estimate),
    // so suggestions can't be harvested for bulk valuations.
    const suggestions = results.map((r) => ({ ...r, capital_value: null }));
    return NextResponse.json({ results: suggestions }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[valuation] address search failed:", e);
    return NextResponse.json({ results: [] });
  }
}