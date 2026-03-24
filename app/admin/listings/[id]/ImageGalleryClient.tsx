// app/admin/listings/[id]/ImageGalleryClient.tsx
"use client";

import { useState } from "react";
import {
  deleteImage,
  moveImageDown,
  moveImageUp,
  setCoverImage,
  updateAltText,
} from "./image-actions";

type GalleryImage = {
  id: string;
  listing_id: string;
  storage_path: string | null;
  alt: string | null;
  sort_order: number | null;
  is_cover: boolean | null;
  created_at: string | null;
  publicUrl: string | null;
};

export default function ImageGalleryClient({
  listingId,
  images,
}: {
  listingId: string;
  images: GalleryImage[];
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!images || images.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-6">
        <h3 className="text-lg font-semibold">Photos</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          No photos yet. Upload one above to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Photos</h3>
        <p className="text-sm text-muted-foreground">
          Reorder photos, choose a cover image, update alt text, or delete.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((img, idx) => {
          const isCover = !!img.is_cover;

          return (
            <div key={img.id} className="rounded-2xl border overflow-hidden">
              <div className="relative">
                {img.publicUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.publicUrl}
                    alt={img.alt ?? "Listing photo"}
                    className="h-48 w-full object-cover"
                  />
                ) : (
                  <div className="h-48 w-full bg-muted flex items-center justify-center text-sm text-muted-foreground">
                    No preview
                  </div>
                )}

                {isCover ? (
                  <div className="absolute left-2 top-2 rounded-full bg-black px-2.5 py-1 text-xs font-medium text-white">
                    Cover
                  </div>
                ) : null}
              </div>

              <div className="p-4 space-y-3">
                <div className="text-xs text-muted-foreground">
                  Order: {img.sort_order ?? idx + 1}
                </div>

                {/* Alt text editor */}
                <form action={updateAltText} className="space-y-2">
                  <input type="hidden" name="listing_id" value={listingId} />
                  <input type="hidden" name="image_id" value={img.id} />
                  <label className="block text-xs font-medium text-muted-foreground">
                    Alt text
                  </label>
                  <input
                    name="alt"
                    defaultValue={img.alt ?? ""}
                    placeholder="e.g. Front exterior"
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
                  >
                    Save alt
                  </button>
                </form>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {/* Move up */}
                  <form action={moveImageUp}>
                    <input type="hidden" name="listing_id" value={listingId} />
                    <input type="hidden" name="image_id" value={img.id} />
                    <button
                      type="submit"
                      className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
                      disabled={idx === 0}
                      title={idx === 0 ? "Already first" : "Move up"}
                    >
                      ↑
                    </button>
                  </form>

                  {/* Move down */}
                  <form action={moveImageDown}>
                    <input type="hidden" name="listing_id" value={listingId} />
                    <input type="hidden" name="image_id" value={img.id} />
                    <button
                      type="submit"
                      className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
                      disabled={idx === images.length - 1}
                      title={idx === images.length - 1 ? "Already last" : "Move down"}
                    >
                      ↓
                    </button>
                  </form>

                  {/* Set cover */}
                  {!isCover ? (
                    <form action={setCoverImage} className="flex-1">
                      <input type="hidden" name="listing_id" value={listingId} />
                      <input type="hidden" name="image_id" value={img.id} />
                      <button
                        type="submit"
                        className="w-full rounded-xl bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90"
                      >
                        Set cover
                      </button>
                    </form>
                  ) : (
                    <div className="flex-1">
                      <div className="w-full rounded-xl border px-3 py-2 text-sm font-medium text-center text-muted-foreground">
                        Cover selected
                      </div>
                    </div>
                  )}
                </div>

                {/* Delete with confirm */}
                <div>
                  {confirmDeleteId === img.id ? (
                    <div className="space-y-2">
                      <div className="text-xs text-red-700">
                        Delete this image? This removes it from Storage and DB.
                      </div>
                      <div className="flex gap-2">
                        <form action={deleteImage} className="flex-1">
                          <input
                            type="hidden"
                            name="listing_id"
                            value={listingId}
                          />
                          <input type="hidden" name="image_id" value={img.id} />
                          <button
                            type="submit"
                            className="w-full rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                          >
                            Confirm delete
                          </button>
                        </form>
                        <button
                          type="button"
                          className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="w-full rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                      onClick={() => setConfirmDeleteId(img.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>

                {/* Debug info (optional) */}
                {img.storage_path ? (
                  <div className="text-[11px] text-muted-foreground break-all">
                    {img.storage_path}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}