// app/api/listings/route.ts
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/guards";
import { createListing, getAllListings } from "@/lib/db/listings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await requireUser(); // ensures auth cookie present

  const url = new URL(req.url);
  const includeDeleted = url.searchParams.get("includeDeleted") === "true";

  const listings = await getAllListings({ includeDeleted });
  return NextResponse.json({ listings });
}

export async function POST(req: Request) {
  const user = await requireUser(); // expects your guard returns user/session

  const body = await req.json();

  // Minimal safe create payload
  const created = await createListing({
    owner_id: user.id,
    title: body?.title ?? null,
    description: body?.description ?? null,
    status: body?.status ?? "draft",
    price_numeric: body?.price_numeric ?? null,
    price_display: body?.price_display ?? null,
    slug: body?.slug ?? null,
  });

  return NextResponse.json({ listing: created }, { status: 201 });
}
