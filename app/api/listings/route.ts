// app/api/listings/route.ts
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/guards";
import { createListing } from "@/lib/db/listings";

export async function POST(req: Request) {
  await requireUser(); // ensures auth cookie present
  const body = await req.json();
  try {
    const created = await createListing({
      title: body.title,
      description: body.description,
      price_numeric: body.price_numeric ?? null,
      price_display: body.price_display ?? null,
      property_type: body.property_type ?? "house",
      bedrooms: body.bedrooms ?? null,
      bathrooms: body.bathrooms ?? null,
      car_spaces: body.car_spaces ?? null,
      city: body.city ?? null,
      region: body.region ?? null,
    });
    return NextResponse.json({ ok: true, listing: created }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}