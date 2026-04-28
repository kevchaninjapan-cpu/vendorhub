// app/admin/listings/[id]/AdminImageGallery.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "../../../../components/ui/button";

type ListingImage = {
  id: string;
  listing_id: string;
  url: string;
  sort_order: number | null;
  is_cover: boolean | null;
  created_at: string | null;
};

type Props = { listingId: string };

export default function AdminImageGallery({ listingId }: Props) {
  const [images, setImages] = React.useState<ListingImage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [settingCoverId, setSettingCoverId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") setLoading(true);
    if (mode === "refresh") setRefreshing(true);

    setError(null);

    try {
      const res = await fetch(`/api/admin/listings/${listingId}/images`, {
        method: "GET",
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to load images");
      }

      const next = (json?.images ?? []) as ListingImage[];

      // Sort stable: cover first, then sort_order (nulls last), then created_at
      next.sort((a, b) => {
        const ac = a.is_cover ? 1 : 0;
        const bc = b.is_cover ? 1 : 0;
        if (ac !== bc) return bc - ac;

        const ao = a.sort_order ?? Number.MAX_SAFE_INTEGER;
        const bo = b.sort_order ?? Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;

        const at = a.created_at ?? "";
        const bt = b.created_at ?? "";
        return at.localeCompare(bt);
      });

      setImages(next);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load images");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [listingId]);

  React.useEffect(() => {
    void load("initial");
  }, [load]);

  const setCover = React.useCallback(
    async (imageId: string) => {
      setSettingCoverId(imageId);
      setError(null);

      try {
        // Optional endpoint — implement when ready:
        // PATCH /api/admin/listings/[id]/images/[imageId]/cover
        const res = await fetch(
          `/api/admin/listings/${listingId}/images/${imageId}/cover`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
          }
        );

        const json = await res.json().catch(() => ({} as any));

        if (!res.ok) {
          throw new Error(
            json?.error ??
              "Set cover failed (endpoint not implemented yet?)"
          );
        }

        // Update local state optimistically: this one becomes cover, others cleared
        setImages((prev) =>
          prev.map((img) => ({
            ...img,
            is_cover: img.id === imageId,
          }))
        );
      } catch (e: any) {
        setError(e?.message ?? "Set cover failed");
      } finally {
        setSettingCoverId(null);
      }
    },
    [listingId]
  );

  if (loading) {
    return <div className="text-sm text-slate-900">Loading images…</div>;
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-red-600">{error}</div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load("refresh")}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing…" : "Retry"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </div>
      </div>
    );
  }

  if (!images.length) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-slate-900">No images yet.</div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load("refresh")}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((img) => {
          const isCover = !!img.is_cover;
          const isBusy = settingCoverId === img.id;

          return (
            <div
              key={img.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white"
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={img.url}
                  alt="Listing image"
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, 33vw"
                />

                {isCover && (
                  <div className="absolute left-2 top-2 rounded-full bg-blue-600/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow">
                    Cover
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                <span className="truncate text-slate-900">
                  {img.sort_order != null ? `Order ${img.sort_order}` : ""}
                </span>

                <Button
                  type="button"
                  variant={isCover ? "outline" : "outline"}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => void setCover(img.id)}
                  disabled={isCover || isBusy}
                  title={isCover ? "Already cover" : "Set as cover"}
                >
                  {isCover ? "Cover" : isBusy ? "Setting…" : "Set cover"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load("refresh")}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </div>
    </div>
  );
}