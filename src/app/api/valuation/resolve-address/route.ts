import { NextResponse } from "next/server";
import { resolveAddress } from "@/lib/valuation/repository";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const address = url.searchParams.get("address") ?? "";

  if (!address.trim()) {
    return NextResponse.json({ error: "Missing address query param" }, { status: 400 });
  }

  const result = await resolveAddress(address);
  return NextResponse.json(
    {
      address,
      unit_of_property_id: result.unitId,
      akl_key: result.aklKey,
      match_type: result.matchType,
    },
    { status: 200 },
  );
}