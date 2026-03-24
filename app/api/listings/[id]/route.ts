// app/api/listings/[id]/route.ts
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/guards";
import { getListingById, softDeleteListing, updateListing } from "@/lib/db/listings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: { id: string } | Promise<{ id: string }> }
) {
  await requireUser();

  const { id } = await Promise.resolve(ctx.params);
  const listing = await getListingById(id);

  return NextResponse.json({ listing });
}

export async function PATCH(
  req: Request,
  ctx: { params: { id: string } | Promise<{ id: string }> }
) {
  await requireUser();

  const { id } = await Promise.resolve(ctx.params);
  const body = await req.json();

  const updated = await updateListing(id, {
    title: body?.title ?? undefined,
    description: body?.description ?? undefined,
    status: body?.status ?? undefined,
    price_numeric: body?.price_numeric ?? undefined,
    price_display: body?.price_display ?? undefined,
    address_line1: body?.address_line1 ?? undefined,
    suburb: body?.suburb ?? undefined,
    city: body?.city ?? undefined,
    region: body?.region ?? undefined,
    postcode: body?.postcode ?? undefined,
    slug: body?.slug ?? undefined,
    published_at: body?.published_at ?? undefined,
  });

  return NextResponse.json({ listing: updated });
}

export async function DELETE(
  _req: Request,
  ctx: { params: { id: string } | Promise<{ id: string }> }
) {
  await requireUser();

  const { id } = await Promise.resolve(ctx.params);
  const deleted = await softDeleteListing(id);

  return NextResponse.json({ listing: deleted });
}