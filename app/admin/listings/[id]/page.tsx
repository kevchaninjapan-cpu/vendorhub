// app/admin/listings/[id]/page.tsx
import { redirect } from 'next/navigation'
import { requireAdminAuth } from '@/lib/guards'
import ImageUploader from './ImageUploader'
import ImageGallery from './ImageGallery'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminListingEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // ✅ Auth must happen INSIDE the request
  const user = await requireAdminAuth()
  if (!user) redirect('/login')

  const { id: listingId } = await params

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Edit Listing
        </h1>
        <p className="text-sm text-muted-foreground">
          Listing ID: {listingId}
        </p>
      </div>

      <ImageUploader listingId={listingId} />
      <ImageGallery listingId={listingId} />
    </div>
  )
}