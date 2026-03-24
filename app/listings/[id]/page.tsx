// app/listings/[id]/page.tsx
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { notFound, permanentRedirect } from "next/navigation";

type Listing = {
  id: string;
  title: string | null;
  description: string | null;
  slug: string | null;

  price_display: string | null;
  price_numeric: number | null;

  status: string | null;

  bedrooms: number | null;
  bathrooms: number | null;
  car_spaces: number | null;

  address_line1: string | null;
  address_line2: string | null;
  suburb: string | null;
  city: string | null;
  region: string | null;
  postcode: string | null;

  created_at: string | null;
  updated_at: string | null;
  published_at: string | null;
  deleted_at: string | null;
};

type ListingImage = {
  id: string;
  listing_id: string;
  storage_path: string | null; // ✅ your actual column
  alt: string | null;
  sort_order: number | null;
  is_cover: boolean | null;
  created_at: string | null;
};

// ✅ Your public bucket (from your SQL output)
const LISTING_IMAGES_BUCKET = "listing-photos";

const LISTING_SELECT = `
  id,
  title,
  description,
  slug,
  price_display,
  price_numeric,
  status,
  bedrooms,
  bathrooms,
  car_spaces,
  address_line1,
  address_line2,
  suburb,
  city,
  region,
  postcode,
  created_at,
  updated_at,
  published_at,
  deleted_at
` as const;

// ✅ UUID detector so we never compare slug to uuid
function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
}

async function getListingByIdOrSlug(idOrSlug: string) {
  const supabase = await getSupabase();
  const base = supabase.from("listings").select(LISTING_SELECT).limit(1);

  const { data, error } = isUuid(idOrSlug)
    ? await base.eq("id", idOrSlug)
    : await base.eq("slug", idOrSlug);

  if (error) throw new Error(error.message);
  return (data?.[0] ?? null) as Listing | null;
}

async function getCoverImageAndUrl(listingId: string) {
  const supabase = await getSupabase();

  // ✅ FIX: use storage_path + alt (no url column exists)
  const { data, error } = await supabase
    .from("listing_images")
    .select("id, listing_id, storage_path, alt, sort_order, is_cover, created_at")
    .eq("listing_id", listingId)
    .order("is_cover", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) throw new Error(error.message);

  const cover = (data?.[0] ?? null) as ListingImage | null;

  if (!cover?.storage_path) {
    return { cover: null, coverUrl: null };
  }

  // ✅ Public bucket: build a public URL
  const { data: publicData } = supabase.storage
    .from(LISTING_IMAGES_BUCKET)
    .getPublicUrl(cover.storage_path);

  const coverUrl = publicData?.publicUrl ?? null;

  return { cover, coverUrl };
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idOrSlug } = await params;

  const listing = await getListingByIdOrSlug(idOrSlug);
  if (!listing) notFound();

  // ✅ Public safety (tweak if you want drafts visible in dev)
  if (listing.deleted_at) notFound();
  if ((listing.status ?? "").toLowerCase() !== "active") notFound();

  // ✅ Canonical redirect: UUID -> slug (if slug exists)
  if (isUuid(idOrSlug) && listing.slug) {
    permanentRedirect(`/listings/${listing.slug}`);
  }

  const { cover, coverUrl } = await getCoverImageAndUrl(listing.id);

  const address = [listing.address_line1, listing.suburb, listing.city, listing.region]
    .filter(Boolean)
    .join(", ");

  const priceText =
    (listing.price_display && listing.price_display.trim()) ||
    (listing.price_numeric !== null
      ? new Intl.NumberFormat("en-NZ", {
          style: "currency",
          currency: "NZD",
          maximumFractionDigits: 0,
        }).format(listing.price_numeric)
      : "—");

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {listing.title ?? "Untitled listing"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{address || "—"}</p>
        </div>

        <div className="text-right">
          <div className="text-2xl font-semibold">{priceText}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {listing.bedrooms ?? "—"} bd • {listing.bathrooms ?? "—"} ba •{" "}
            {listing.car_spaces ?? "—"} car
          </div>
        </div>
      </div>

      {coverUrl ? (
        <div className="overflow-hidden rounded-2xl border bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt={cover?.alt ?? listing.title ?? "Listing image"}
            className="w-full h-auto"
          />
        </div>
      ) : null}

      {listing.description ? (
        <div className="rounded-2xl border bg-white p-6">
          <h2 className="text-lg font-medium">Description</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
            {listing.description}
          </p>
        </div>
      ) : null}
    </div>
  );
}