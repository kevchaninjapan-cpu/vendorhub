// app/api/admin/listings/[id]/images/route.ts
import { NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/guards'
import { createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  // ✅ Enforce admin
  await requireAdminAuth()

  const { id: listingId } = params

  const supabase = await createServerClient()

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json(
      { error: 'No file provided' },
      { status: 400 }
    )
  }

  const ext = file.name.split('.').pop()
  const path = `${listingId}/${crypto.randomUUID()}.${ext}`

  const { error: uploadErr } = await supabase.storage
    .from('listing-photos')
    .upload(path, file, { upsert: false })

  if (uploadErr) {
    console.error('[IMAGE_UPLOAD_ERROR]', uploadErr)
    return NextResponse.json(
      { error: uploadErr.message },
      { status: 500 }
    )
  }

  const { error: dbErr } = await supabase
    .from('listing_images')
    .insert({
      listing_id: listingId,
      storage_path: path,
    })

  if (dbErr) {
    console.error('[IMAGE_DB_INSERT_ERROR]', dbErr)
    return NextResponse.json(
      { error: dbErr.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}