import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route'
import { isAdminUser } from '@/lib/auth/admin'

export const dynamic = 'force-dynamic'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createRouteHandlerClient()

  const { data, error: authErr } = await supabase.auth.getUser()
  if (authErr) console.error('[API_RESTORE_AUTH_ERROR]', authErr)

  const user = data?.user
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: listing, error: readErr } = await supabase
    .from('listings')
    .select('id, status')
    .eq('id', id)
    .maybeSingle()

  if (readErr) {
    console.error('[API_RESTORE_READ_ERROR]', readErr)
    return NextResponse.json({ error: 'Unable to read listing' }, { status: 500 })
  }
  if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (listing.status !== 'archived') {
    return NextResponse.json({ error: 'Only archived listings can be restored' }, { status: 400 })
  }

  const { error: updErr } = await supabase
    .from('listings')
    .update({ status: 'draft' })
    .eq('id', id)

  if (updErr) {
    console.error('[API_RESTORE_UPDATE_ERROR]', updErr)
    return NextResponse.json({ error: 'Unable to restore listing' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}