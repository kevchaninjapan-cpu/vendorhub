import { rateLimitResponse } from "@/lib/security/rate-limit";
import { NextResponse } from "next/server";
import { estimateValue } from "@/lib/valuation/engine";

export async function POST(req: Request) {
  const __vhLimited = await rateLimitResponse("valuation-estimate");
  if (__vhLimited) return __vhLimited;
  const body = await req.json().catch(() => ({}));

  const result = await estimateValue({
    unit_of_property_id: body.unit_of_property_id,
    akl_key: body.akl_key,
    address: body.address,
    options: body.options,
  });

  return NextResponse.json(result, { status: 200 });
}