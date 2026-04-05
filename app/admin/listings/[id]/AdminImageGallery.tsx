"use client";

import {
  DndContext,
  closestCenter,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Image = {
  id: string;
  publicUrl: string;
  is_cover: boolean | null;
};

function SortableImage({
  image,
  onSetCover,
}: {
  image: Image;
  onSetCover: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-xl border ${
        image.is_cover ? "ring-2 ring-black" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      <img
        src={image.publicUrl}
        className="aspect-video w-full rounded-xl object-cover"
      />

      {!image.is_cover && (
        <button
          onClick={() => onSetCover(image.id)}
          className="absolute bottom-2 right-2 rounded bg-black px-2 py-1 text-xs text-white"
        >
          Set cover
        </button>
      )}

      {image.is_cover && (
        <div className="absolute top-2 left-2 rounded bg-black px-2 py-1 text-xs text-white">
          Cover
        </div>
      )}
    </div>
  );
}

export default function AdminImageGallery({
  listingId,
  images,
}: {
  listingId: string;
  images: Image[];
}) {
  async function persistOrder(order: string[]) {
    await fetch(`/api/admin/listings/${listingId}/images`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    });
  }

  async function setCover(id: string) {
    await fetch(`/api/admin/listings/${listingId}/images`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coverImageId: id }),
    });

    location.reload();
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const oldIndex = images.findIndex(i => i.id === active.id);
    const newIndex = images.findIndex(i => i.id === over.id);

    const reordered = arrayMove(images, oldIndex, newIndex);
    persistOrder(reordered.map(i => i.id));
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={images.map(i => i.id)}>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {images.map(img => (
            <SortableImage
              key={img.id}
              image={img}
              onSetCover={setCover}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
