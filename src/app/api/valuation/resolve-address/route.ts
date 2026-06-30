import { NextResponse } from "next/server";
import { resolveAddress } from "@/lib/valuation/repository";
import { geocodeAddress } from "@/lib/valuation/geocode";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const address = url.searchParams.get("address") ?? "";

  if (!address.trim()) {
    return NextResponse.json(
      { error: "Missing address query param" },
      { status: 400 }
    );
  }

  // 1. Resolve to DVR / AKL identifiers via the existing repository
  const result = await resolveAddress(address);

  // 2. Geocode to lat/lng + suburb/postcode in parallel
  //    (best-effort — null on failure)
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
    { status: 200 }
  );
}