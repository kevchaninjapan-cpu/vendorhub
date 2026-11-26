import { NextResponse } from "next/server";
import { rateLimitResponse } from "@/lib/security/rate-limit";
import { estimateValue } from "@/lib/valuation/engine";
import { getStaff } from "@/lib/ops/staff";

// Public valuation estimate. Rate limited per visitor (5 a day signed out).
//
// What a visitor can ask for is deliberately narrow:
//   * debug output (raw property records and neighbouring properties) is
//     only available to a signed-in admin
//   * the number of comparables is capped
//   * input is checked for type and length

const MAX_TEXT = 300;
const MAX_ID = 64;
const MAX_COMPS = 50;

function text(value: unknown, max: number): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) value = String(value);
  if (typeof value !== "string") return undefined;
  const s = value.trim();
  if (!s || s.length > max) return undefined;
  return s;
}

export async function POST(req: Request) {
  const limited = await rateLimitResponse("valuation-estimate");
  if (limited) return limited;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Please enter an address." }, { status: 400 });
  }

  const unitId = text(body.unit_of_property_id, MAX_ID);
  const aklKey = text(body.akl_key, MAX_ID);
  const address = text(body.address, MAX_TEXT);
  if (!unitId && !aklKey && !address) {
    return NextResponse.json({ error: "Please enter an address." }, { status: 400 });
  }

  const raw = body.options && typeof body.options === "object" ? (body.options as Record<string, unknown>) : {};
  const includeComps = raw.include_comps !== false;

  let compsLimit = Number(raw.comps_limit);
  if (!Number.isFinite(compsLimit)) compsLimit = MAX_COMPS;
  compsLimit = Math.min(MAX_COMPS, Math.max(1, Math.floor(compsLimit)));

  // Debug output exposes raw records, so it needs a signed-in admin.
  let includeDebug = false;
  if (raw.include_debug === true) {
    const staff = await getStaff();
    includeDebug = staff?.role === "admin";
  }

  try {
    const result = await estimateValue({
      unit_of_property_id: unitId,
      akl_key: aklKey,
      address,
      options: { include_comps: includeComps, include_debug: includeDebug, comps_limit: compsLimit },
    });

    // Second layer: never send debug data unless an admin asked for it.
    const publicResult = includeDebug ? result : { ...result, debug: undefined };

    return NextResponse.json(publicResult, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[valuation] estimate failed:", e);
    return NextResponse.json(
      { error: "We couldn't produce an estimate right now. Please try again." },
      { status: 500 }
    );
  }
}