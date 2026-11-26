import { NextResponse } from "next/server";
import { rateLimitResponse } from "@/lib/security/rate-limit";
import { resolveAddress } from "@/lib/valuation/repository";
import { geocodeAddress } from "@/lib/valuation/geocode";

const MAX_ADDRESS = 300;

export async function GET(req: Request) {
  const limited = await rateLimitResponse("valuation-resolve");
  if (limited) return limited;

  const url = new URL(req.url);
  const address = (url.searchParams.get("address") ?? "").trim();

  if (!address) {
    return NextResponse.json({ error: "Missing address query param" }, { status: 400 });
  }
  if (address.length > MAX_ADDRESS) {
    return NextResponse.json({ error: "That address is too long." }, { status: 400 });
  }

  try {
    // 1. Resolve to DVR / AKL identifiers via the existing repository
    const result = await resolveAddress(address);

    // 2. Geocode to lat/lng + suburb/postcode (best-effort: null on failure)
    const geo = await geocodeAddress(address).catch(() => null);

    return NextResponse.json(
      {
        address,
        unit_of_property_id: result.unitId,
        akl_key: result.aklKey,
        match_type: result.matchType,
        lat: geo?.lat ?? null,
        lng: geo?.lng ?? null,
        street_address: geo?.street ?? null,
        suburb: geo?.suburb ?? null,
        region: geo?.region ?? null,
        postcode: geo?.postcode ?? null,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("[valuation] resolve-address failed:", e);
    return NextResponse.json(
      { error: "We couldn't look up that address. Please try again." },
      { status: 500 }
    );
  }
}