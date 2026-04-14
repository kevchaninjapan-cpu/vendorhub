"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  deleteImage,
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

function DragHandleIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="16"
      height="16"
      aria-hidden="true"
      className="opacity-70"
    >
      <path
        d="M7 4h2v2H7V4zm4 0h2v2h-2V4zM7 8h2v2H7V8zm4 0h2v2h-2V8zM7 12h2v2H7v-2zm4 0h2v2h-2v-2z"
        fill="currentColor"
      />
    </svg>
  );
}

function SortablePhotoCard({
  img,
  listingId,
  indexLabel,
  onRequestDelete,
}: {
  img: GalleryImage;
  listingId: string;
  indexLabel: number;
  onRequestDelete: (id: string) => void;
}) {
  // Make the card sortable but ONLY activate dragging from the handle button.
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: img.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.75 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-2xl border overflow-hidden bg-white"
    >
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

        {/* Drag handle (only this starts a drag) */}
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="absolute right-2 top-2 inline-flex items-center gap-2 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium shadow-sm hover:bg-white"
          title="Drag to reorder"
        >
          <DragHandleIcon />
          Drag
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="text-xs text-muted-foreground">
          Position: {indexLabel}
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

        {/* Cover / Delete actions */}
        <div className="flex flex-wrap gap-2">
          {!img.is_cover ? (
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

          <button
            type="button"
            className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            onClick={() => onRequestDelete(img.id)}
          >
            Delete
          </button>
        </div>

        {img.storage_path ? (
          <div className="text-[11px] text-muted-foreground break-all">
            {img.storage_path}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CoverCard({
  img,
  listingId,
  onRequestDelete,
}: {
  img: GalleryImage;
  listingId: string;
  onRequestDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border overflow-hidden bg-white ring-2 ring-black">
      <div className="relative">
        {img.publicUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img.publicUrl}
            alt={img.alt ?? "Listing cover photo"}
            className="h-48 w-full object-cover"
          />
        ) : (
          <div className="h-48 w-full bg-muted flex items-center justify-center text-sm text-muted-foreground">
            No preview
          </div>
        )}

        <div className="absolute left-2 top-2 rounded-full bg-black px-2.5 py-1 text-xs font-medium text-white">
          Cover
        </div>
      </div>

      <div className="p-4 space-y-3">
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

        <button
          type="button"
          className="w-full rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          onClick={() => onRequestDelete(img.id)}
        >
          Delete
        </button>

        {img.storage_path ? (
          <div className="text-[11px] text-muted-foreground break-all">
            {img.storage_path}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function ImageGalleryClient({
  listingId,
  images,
}: {
  listingId: string;
  images: GalleryImage[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Pin cover image (not draggable)
  const coverImage = useMemo(
    () => images.find((i) => !!i.is_cover) ?? null,
    [images]
  );

  // Only non-cover images participate in sorting
  const initialSortable = useMemo(
    () => images.filter((i) => !i.is_cover),
    [images]
  );

  const [sortableImages, setSortableImages] = useState<GalleryImage[]>(
    initialSortable
  );

  // Keep client state in sync when server refreshes (cover changes, delete, etc.)
  useEffect(() => {
    setSortableImages(initialSortable);
  }, [initialSortable]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function persistOrder(next: GalleryImage[]) {
    // Persist only non-cover image ordering.
    const order = next.map((i) => i.id);

    const res = await fetch(`/api/admin/listings/${listingId}/images`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.error || "Failed to save order");
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSortableImages((curr) => {
      const oldIndex = curr.findIndex((i) => i.id === active.id);
      const newIndex = curr.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return curr;

      const next = arrayMove(curr, oldIndex, newIndex);

      // Optimistic persist
      startTransition(() => {
        persistOrder(next)
          .then(() => router.refresh())
          .catch((e) => {
            console.error(e);
            // If save fails, refresh to revert to server truth
            router.refresh();
          });
      });

      return next;
    });
  }

  if (!images || images.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-6">
        <h3 className="text-lg font-semibold">Photos</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          No photos yet. Upload one below to get started.
        </p>
      </div>
    );
  }

  const allCount = (coverImage ? 1 : 0) + sortableImages.length;

  return (
    <div className="rounded-2xl border bg-white p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Photos</h3>
          <p className="text-sm text-muted-foreground">
            Drag to reorder (non-cover images). Cover is pinned to the top.
          </p>
        </div>

        <div className="text-xs text-muted-foreground">
          {isPending ? "Saving…" : `${allCount} image${allCount === 1 ? "" : "s"}`}
        </div>
      </div>

      {/* Delete confirm */}
      {confirmDeleteId ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <div className="font-medium">Delete this image?</div>
          <div className="mt-1 opacity-90">
            This removes it from Storage and DB.
          </div>
          <div className="mt-3 flex gap-2">
            <form action={deleteImage} className="flex-1">
              <input type="hidden" name="listing_id" value={listingId} />
              <input type="hidden" name="image_id" value={confirmDeleteId} />
              <button
                type="submit"
                className="w-full rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
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
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Cover pinned first */}
        {coverImage ? (
          <CoverCard
            img={coverImage}
            listingId={listingId}
            onRequestDelete={(id) => setConfirmDeleteId(id)}
          />
        ) : null}

        {/* Sortable grid for non-cover images */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={sortableImages.map((i) => i.id)}
            strategy={rectSortingStrategy}
          >
            {sortableImages.map((img, idx) => (
              <SortablePhotoCard
                key={img.id}
                img={img}
                listingId={listingId}
                indexLabel={(coverImage ? 2 : 1) + idx}
                onRequestDelete={(id) => setConfirmDeleteId(id)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
``