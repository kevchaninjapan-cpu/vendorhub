// app/admin/listings/[id]/ImageGallery.tsx
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { requireAdminAuth } from '@/lib/guards'
import ImageGalleryClient from "./ImageGalleryClient";

const BUCKET = "listing-photos";

type ImageRow = {
  id: string;
  listing_id: string;
  storage_path: string | null;
  alt: string | null;
  sort_order: number | null;
  is_cover: boolean | null;
  created_at: string | null;
};

export default async function ImageGallery({ listingId }: { listingId: string }) {
await requireAdminAuth()

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data, error } = await supabase
    .from("listing_images")
    .select("id, listing_id, storage_path, alt, sort_order, is_cover, created_at")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <div className="font-medium">Couldn’t load listing images</div>
        <div className="mt-1 opacity-90">{error.message}</div>
      </div>
    );
  }

  const images = ((data ?? []) as ImageRow[]).map((img) => {
    const url =
      img.storage_path
        ? supabase.storage.from(BUCKET).getPublicUrl(img.storage_path).data.publicUrl
        : null;

    return {
      ...img,
      publicUrl: url,
    };
  });

  return <ImageGalleryClient listingId={listingId} images={images} />;
}
``