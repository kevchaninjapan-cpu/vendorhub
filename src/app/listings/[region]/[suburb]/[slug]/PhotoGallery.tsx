"use client";

import { useState } from "react";

type Media = {
  id: string;
  public_url: string | null;
  is_cover: boolean;
  caption: string | null;
};

export default function PhotoGallery({ media }: { media: Media[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const visible = media.filter((m) => m.public_url);

  if (visible.length === 0) {
    return (
      <div className="flex aspect-[3/2] w-full items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground">
        No photos provided
      </div>
    );
  }

  const cover = visible.find((m) => m.is_cover) ?? visible[0];
  const rest = visible.filter((m) => m.id !== cover.id).slice(0, 4);

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
        <button
          type="button"
          onClick={() => setOpen(visible.indexOf(cover))}
          className="aspect-[3/2] overflow-hidden rounded-md border"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover.public_url!}
            alt=""
            className="h-full w-full object-cover"
          />
        </button>
        <div className="grid grid-cols-2 gap-2">
          {rest.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setOpen(visible.indexOf(m))}
              className="aspect-square overflow-hidden rounded-md border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.public_url!}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={visible[open].public_url!}
            alt=""
            className="max-h-full max-w-full"
          />
          <button
            className="absolute right-4 top-4 rounded bg-white/90 px-3 py-1 text-sm"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(null);
            }}
          >
            Close
          </button>
        </div>
      )}
    </>
  );
}