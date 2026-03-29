import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route'
import { isAdminUser } from '@/lib/auth/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

// Helper: get user (no redirects in API routes)
async function getUserOrNull() {
  const supabase = await createRouteHandlerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error) console.error('[API_LISTING_ID_AUTH_ERROR]', error)
  return { supabase, user: data?.user ?? null }
}

// Helper: owner/admin authorization
function canAccess(user: any, listing: any) {
  if (!user) return false
  if (isAdminUser(user)) return true
  return listing?.owner_id && user.id === listing.owner_id
}

// GET /api/listings/[id]
// Public: only active + not deleted
// Authed: owner/admin can see any non-deleted listing
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const { supabase, user } = await getUserOrNull()

  // If not authed, restrict to public
  if (!user) {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .eq('status', 'active')
      .is('deleted_at', null)
      .maybeSingle()

    if (error) {
      console.error('[API_LISTING_ID_GET_PUBLIC_ERROR]', error)
      return NextResponse.json({ error: 'Unable to fetch listing' }, { status: 500 })
    }
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ listing: data }, { status: 200 })
  }

  // Authed: fetch listing (still hide deleted)
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    console.error('[API_LISTING_ID_GET_ERROR]', error)
    return NextResponse.json({ error: 'Unable to fetch listing' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!canAccess(user, data)) {
    // Non-owner authed users only get active listings
    if (data.status !== 'active') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  return NextResponse.json({ listing: data }, { status: 200 })
}

// PATCH /api/listings/[id]
// Owner/admin only
export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const { supabase, user } = await getUserOrNull()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing, error: readErr } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (readErr) {
    console.error('[API_LISTING_ID_PATCH_READ_ERROR]', readErr)
    return NextResponse.json({ error: 'Unable to read listing' }, { status: 500 })
  }
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!canAccess(user, existing)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({} as any))

  // Whitelist patch fields (prevents owner_id tampering)
  const patch: Record<string, any> = {}

  const allowedKeys = new Set([
    'title',
    'description',
    'price_numeric',
    'price_display',
    'status',
    'property_type',
    'bedrooms',
    'bathrooms',
    'car_spaces',
    'floor_area_m2',
    'land_area_m2',
    'year_built',
    'address_line1',
    'address_line2',
    'suburb',
    'city',
    'region',
    'postcode',
    'latitude',
    'longitude',
    'slug',
    'published_at',
    'expires_at',
  ])

  for (const [k, v] of Object.entries(body ?? {})) {
    if (allowedKeys.has(k)) patch[k] = v
  }

  // Optional: prevent illegal status values
  if (patch.status) {
    const allowedStatus = new Set(['draft', 'active', 'under_offer', 'sold', 'withdrawn'])
    if (!allowedStatus.has(String(patch.status))) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
  }

  const { data: updated, error: updErr } = await supabase
    .from('listings')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (updErr) {
    console.error('[API_LISTING_ID_PATCH_UPDATE_ERROR]', updErr)
    return NextResponse.json({ error: 'Unable to update listing' }, { status: 500 })
  }

  return NextResponse.json({ listing: updated }, { status: 200 })
}

// DELETE /api/listings/[id]
// Soft delete (deleted_at) — owner/admin only
export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const { supabase, user } = await getUserOrNull()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing, error: readErr } = await supabase
    .from('listings')
    .select('id, owner_id')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (readErr) {
    console.error('[API_LISTING_ID_DELETE_READ_ERROR]', readErr)
    return NextResponse.json({ error: 'Unable to read listing' }, { status: 500 })
  }
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!canAccess(user, existing)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error: delErr } = await supabase
    .from('listings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (delErr) {
    console.error('[API_LISTING_ID_DELETE_ERROR]', delErr)
    return NextResponse.json({ error: 'Unable to delete listing' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}