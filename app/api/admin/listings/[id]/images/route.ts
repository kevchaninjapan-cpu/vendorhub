import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route'
import { isAdminUser } from '@/lib/auth/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_BYTES = 8 * 1024 * 1024 // 8MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function extFromType(type: string) {
  switch (type) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    default:
      return 'bin'
  }
}

function safeBaseName(name: string) {
  return (name || 'upload')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: listingId } = await params
  const supabase = await createRouteHandlerClient()

  // Auth + admin gate
  const { data, error: authErr } = await supabase.auth.getUser()
  if (authErr) console.error('[API_ADMIN_IMAGES_AUTH_ERROR]', authErr)

  const user = data?.user
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Ensure listing exists (prevents orphan image rows)
  const { data: listing, error: listingErr } = await supabase
    .from('listings')
    .select('id')
    .eq('id', listingId)
    .maybeSingle()

  if (listingErr) {
    console.error('[API_ADMIN_IMAGES_LISTING_READ_ERROR]', listingErr)
    return NextResponse.json({ error: 'Unable to read listing' }, { status: 500 })
  }
  if (!listing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Parse form-data
  let formData: FormData
  try {
    formData = await req.formData()
  } catch (e) {
    console.error('[API_ADMIN_IMAGES_FORMDATA_ERROR]', e)
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file field "file"' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 })
  }

  const ext = extFromType(file.type)
  const base = safeBaseName(file.name)
  const storagePath = `listings/${listingId}/${crypto.randomUUID()}-${base}.${ext}`

  // Upload to storage
  const bucket = supabase.storage.from('listing-photos')
  const { error: uploadErr } = await bucket.upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  })

  if (uploadErr) {
    console.error('[API_ADMIN_IMAGES_UPLOAD_ERROR]', uploadErr)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  // Insert DB row
  const { data: row, error: insertErr } = await supabase
    .from('listing_images')
    .insert({ listing_id: listingId, storage_path: storagePath })
    .select('id, listing_id, storage_path, created_at')
    .single()

  if (insertErr) {
    console.error('[API_ADMIN_IMAGES_DB_INSERT_ERROR]', insertErr)
    // best-effort cleanup
    try {
      await bucket.remove([storagePath])
    } catch (e) {
      console.error('[API_ADMIN_IMAGES_CLEANUP_ERROR]', e)
    }
    return NextResponse.json({ error: 'Database insert failed' }, { status: 500 })
  }

  const { data: pub } = bucket.getPublicUrl(storagePath)

  return NextResponse.json(
    {
      ok: true,
      image: {
        ...row,
        publicUrl: pub.publicUrl,
      },
    },
    { status: 201 }
  )
}