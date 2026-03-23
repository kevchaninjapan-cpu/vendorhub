// app/listings/[id]/page.tsx

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

type Listing = Database["public"]["Tables"]["listings"]["Row"];
type ListingImage = Database["public"]["Tables"]["listing_images"]["Row"];

// Build a public URL for a storage path (public bucket scenario)
function publicUrlFromPath(
  supabase: ReturnType<typeof createServerClient<Database>>,
  path: string
) {
  const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
  return data.publicUrl;
}

async function getListingAndCover(id: string) {
  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  // 1) Fetch the listing
  const { data: listing, error: listingErr } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();

  if (listingErr) {
    throw new Error(listingErr.message);
  }

  // 2) Fetch the first image (prefer is_cover, then sort_order, then created_at)
  const { data: images, error: imagesErr } = await supabase
    .from("listing_images")
    .select("*")
    .eq("listing_id", id)
    .order("is_cover", { ascending: false, nullsFirst: false })
    .order("sort_order", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true })
    .limit(1);

  if (imagesErr) {
    throw new Error(imagesErr.message);
  }

  let coverUrl: string | null = null;

  const cover = (images?.[0] as ListingImage | undefined) ?? null;
  if (cover?.storage_path) {
    coverUrl = publicUrlFromPath(supabase, cover.storage_path);
  }

  return { listing: listing as Listing, coverUrl };
}

export default async function ListingPage({
  // In Next.js 15, params may be a Promise in server components
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Await the route params before using them
  const { id } = await params;

  const { listing, coverUrl } = await getListingAndCover(id);

  return (
    <div className="space-y-6">
      {coverUrl && (
        <img
          src={coverUrl}
          className="w-full max-h-96 object-cover rounded-xl"
          alt="Listing cover"
        />
      )}

      <h1 className="text-2xl font-semibold">{listing.title ?? "Listing"}</h1>
      <p className="text-gray-600">{listing.description ?? ""}</p>
    </div>
  );
}