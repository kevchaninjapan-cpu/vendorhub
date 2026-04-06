// app/admin/listings/[id]/AdminImageGallery.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

type ListingImage = {
  id: string;
  listing_id: string;
  url: string;
  sort_order: number | null;
  is_cover: boolean | null;
  created_at: string | null;
};

export default function AdminImageGallery({ listingId }: { listingId: string }) {
  const [images, setImages] = React.useState<ListingImage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/listings/${listingId}/images`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

    const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to load images");
      }

      setImages((json?.images ?? []) as ListingImage[]);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load images");
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <div className="text-sm text-muted">Loading images…</div>;

  if (error) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-red-600">{error}</div>
        <Button variant="outline" size="sm" onClick={load}>
          Retry
        </Button>
      </div>
    );
  }

  if (!images.length) {
    return <div className="text-sm text-muted">No images yet.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((img) => (
          <div
            key={img.id}
            className="overflow-hidden rounded-xl border border-border/40 bg-background"
          >
            <div className="relative aspect-[4/3]">
              <Image
                src={img.url}
                alt="Listing image"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, 33vw"
              />
            </div>

            <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
              <span className="text-muted truncate">
                {img.is_cover ? "Cover" : ""}
              </span>

              {/* Placeholder action – wire later */}
              <Button variant="outline" size="sm" className="h-7 px-2">
                Set cover
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={load}>
        Refresh
      </Button>
    </div>
  );
}
``