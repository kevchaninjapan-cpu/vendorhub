import { NextResponse } from "next/server";
import { estimateValueRange } from "@/lib/valuation";
import {
  resolveValuationInput,
  PropertyNotFoundError,
  MultipleMatchesError,
} from "@/lib/valuation/fetchers";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body." },
      { status: 400 },
    );
  }

  const streetNumber = String(body.streetNumber ?? "").trim();
  const streetName = String(body.streetName ?? "").trim();
  const suburb = body.suburb ? String(body.suburb).trim() : undefined;
  const city = body.city ? String(body.city).trim() : undefined;

  if (!streetName) {
    return NextResponse.json(
      { error: "streetName is required." },
      { status: 422 },
    );
  }

  const apiKey = process.env.LINZ_API_KEY ?? "";

  try {
    const resolved = await resolveValuationInput(
      { streetNumber, streetName, suburb, city },
      apiKey,
    );

    const valuation = estimateValueRange(resolved.input);

    return NextResponse.json(
      {
        success: true,
        matchedAddress: resolved.matchedAddress,
        dvrRecordId: resolved.dvrRecordId,
        dataSource: resolved.source,
        valuation,
      },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof PropertyNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }

    if (err instanceof MultipleMatchesError) {
      return NextResponse.json(
        {
          error: err.message,
          matches: err.matches,
        },
        { status: 300 },
      );
    }

    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}