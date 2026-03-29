import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Day 20 hardening:
 * - Only expose ACTIVE listings on public route
 * - Per-listing SEO metadata + OG image (first listing photo)
 * - Server-side errors logged; user gets clean notFound()
 *
 * NOTE: If next/image blocks Supabase URLs, add your Supabase storage host to
 * next.config.js -> images.remotePatterns. (Recommended for full optimization.)
 */

type Params = { id: string }

function buildTitle(listing: any) {
  const location = [listing?.suburb, listing?.city].filter(Boolean).join(', ')
  const base = listing?.title || 'Listing'
  return location ? `${base} · ${location}` : base
}

function safeText(input: unknown, maxLen = 160) {
  const s = String(input ?? '').trim()
  if (!s) return ''
  return s.length > maxLen ? `${s.slice(0, maxLen - 1)}…` : s
}

export async function generateMetadata(
  { params }: { params: Promise<Params> }
): Promise<Metadata> {
  const { id } = await params
  const supabase = await createServerClient()

  // Only fetch fields needed for metadata (fast + safe)
  const { data: listing, error: listingErr } = await supabase
    .from('listings')
    .select('id, title, suburb, city, status')
    .eq('id', id)
    .maybeSingle()

  if (listingErr) {
    console.error('[PUBLIC_LISTING_METADATA_LISTING_ERROR]', listingErr)
    return { title: 'Listing not available | VendorHub' }
  }

  // Do not leak non-active listings via metadata
  if (!listing || listing.status !== 'active') {
    return { title: 'Listing not available | VendorHub' }
  }

  // Attempt OG image from first listing photo (optional)
  let ogImageUrl: string | undefined
  const { data: firstImage, error: imgErr } = await supabase
    .from('listing_images')
    .select('storage_path, created_at')
    .eq('listing_id', id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (imgErr) {
    console.error('[PUBLIC_LISTING_METADATA_IMAGE_ERROR]', imgErr)
  } else if (firstImage?.storage_path) {
    const { data } = supabase.storage.from('listing-photos').getPublicUrl(firstImage.storage_path)
    ogImageUrl = data.publicUrl
  }

  const title = `${buildTitle(listing)} | VendorHub`
  const description = safeText(
    `View details for ${listing.title || 'this listing'} on VendorHub.`,
    160
  )

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vendorhub.nz'
  const canonical = `${siteUrl}/listings/${id}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonical,
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
    },
    twitter: {
      card: ogImageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      images: ogImageUrl ? [ogImageUrl] : undefined,
    },
  }
}

export default async function PublicListingPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const supabase = await createServerClient()

  // Fetch listing (you can slim this down later once your schema is stable)
  const { data: listing, error: listingErr } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (listingErr) {
    console.error('[PUBLIC_LISTING_QUERY_ERROR]', listingErr)
    notFound()
  }

  // Hard rule: public route only shows active listings
  if (!listing || listing.status !== 'active') {
    notFound()
  }

  // Fetch images
  const { data: images, error: imgErr } = await supabase
    .from('listing_images')
    .select('id, storage_path, created_at')
    .eq('listing_id', id)
    .order('created_at', { ascending: true })

  if (imgErr) {
    console.error('[PUBLIC_LISTING_IMAGES_QUERY_ERROR]', imgErr)
  }

  const bucket = supabase.storage.from('listing-photos')
  const imageUrls =
    images?.map((img) => {
      const { data } = bucket.getPublicUrl(img.storage_path)
      return { id: img.id, url: data.publicUrl }
    }) ?? []

  const title = listing.title ?? 'Listing'
  const location = [listing.suburb, listing.city].filter(Boolean).join(', ')

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {location ? <p className="mt-1 text-gray-700">{location}</p> : null}
        <p className="mt-1 text-xs text-gray-500">Listing ID: {listing.id}</p>
      </header>

      {/* Gallery */}
      {imageUrls.length ? (
        <section className="mb-8">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {imageUrls.map((img, idx) => (
              <div
                key={img.id}
                className="relative aspect-[4/3] overflow-hidden rounded border bg-gray-50"
              >
                <Image
                  src={img.url}
                  alt={`${title} photo ${idx + 1}`}
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover"
                  // If you haven't configured next/image remotePatterns yet, this prevents runtime blocking:
                  // Remove once next.config.js includes your Supabase storage domain.
                  unoptimized
                  priority={idx === 0}
                />
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="mb-8 rounded border p-4 text-sm text-gray-600">
          No photos available yet.
        </section>
      )}

      {/* Details (keep flexible because your schema may evolve) */}
      <section className="rounded border p-5">
        <h2 className="text-lg font-semibold">Details</h2>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {listing.price != null ? (
            <div>
              <div className="text-xs text-gray-500">Price</div>
              <div className="font-medium">{String(listing.price)}</div>
            </div>
          ) : null}

          {listing.bedrooms != null ? (
            <div>
              <div className="text-xs text-gray-500">Bedrooms</div>
              <div className="font-medium">{String(listing.bedrooms)}</div>
            </div>
          ) : null}

          {listing.bathrooms != null ? (
            <div>
              <div className="text-xs text-gray-500">Bathrooms</div>
              <div className="font-medium">{String(listing.bathrooms)}</div>
            </div>
          ) : null}

          {listing.carparks != null ? (
            <div>
              <div className="text-xs text-gray-500">Carparks</div>
              <div className="font-medium">{String(listing.carparks)}</div>
            </div>
          ) : null}

          {listing.updated_at ? (
            <div>
              <div className="text-xs text-gray-500">Last updated</div>
              <div className="font-medium">
                {new Date(listing.updated_at).toLocaleString()}
              </div>
            </div>
          ) : null}
        </div>

        {listing.description ? (
          <div className="mt-5">
            <div className="text-xs text-gray-500">Description</div>
            <p className="mt-2 whitespace-pre-line text-gray-800">
              {String(listing.description)}
            </p>
          </div>
        ) : null}
      </section>
    </main>
  )
}