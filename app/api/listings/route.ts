// app/api/listings/route.ts
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/guards'
import { createListing, getAllListings } from '@/lib/db/listings'

export const runtime = 'nodejs'

/**
 * GET /api/listings
 * Returns a list of listings (currently uses getAllListings from lib/db/listings).
 */
export async function GET() {
  try {
    const listings = await getAllListings()
    return NextResponse.json({ listings }, { status: 200 })
  } catch (e) {
    console.error('[API_LISTINGS_GET_ERROR]', e)
    return NextResponse.json({ error: 'Unable to fetch listings' }, { status: 500 })
  }
}

/**
 * POST /api/listings
 * Creates a listing owned by the authenticated user.
 * Minimal safe payload; server sets ownership.
 */
export async function POST(req: Request) {
  try {
    // ✅ IMPORTANT: capture returned user (fixes "Cannot find name 'user'")
    const user = await requireAuth()

    const body = await req.json().catch(() => ({} as any))

    // Minimal safe create payload (matches your current style)
    const created = await createListing({
      owner_id: user.id,
      title: body?.title ?? null,
      description: body?.description ?? null,
      status: body?.status ?? 'draft',
      price_numeric: body?.price_numeric ?? null,
      price_display: body?.price_display ?? null,
      slug: body?.slug ?? null,
    })

    return NextResponse.json({ listing: created }, { status: 201 })
  } catch (e: any) {
    // If requireAuth() redirected, Next will handle it.
    // If createListing throws, we return a safe error.
    console.error('[API_LISTINGS_POST_ERROR]', e)

    // Optional: basic client error support
    const message =
      typeof e?.message === 'string' && e.message.length < 200
        ? e.message
        : 'Unable to create listing'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}