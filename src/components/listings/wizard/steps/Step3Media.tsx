"use client";

import { useEffect, useState, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import { recordMediaUpload, deleteMedia } from "@/lib/listings/actions";
import type { ListingDraft } from "@/types/marketplace";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Spinner } from "@/components/ui/Spinner";

type Props = {
  draft: ListingDraft;
  busy: boolean;
  onBack: () => void;
  onNext: () => void;
};

type MediaRow = {
  id: string;
  public_url: string | null;
  storage_path: string;
  is_cover: boolean;
};

type UploadProgress = {
  fileName: string;
  progress: number;
};

export function Step3Media({ draft, busy, onBack, onNext }: Props) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [media, setMedia] = useState<MediaRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!draft.id) return;
    supabase
      .from("listing_media")
      .select("id, public_url, storage_path, is_cover")
      .eq("listing_id", draft.id)
      .order("sort_order")
      .then(({ data }) => setMedia((data ?? []) as MediaRow[]));
  }, [draft.id, supabase]);

  async function processFiles(files: FileList | File[]) {
    const fileArr = Array.from(files);
    if (!fileArr.length || !draft.id) return;

    // Filter to images only
    const validFiles = fileArr.filter((f) => f.type.startsWith("image/"));
    if (validFiles.length < fileArr.length) {
      toast.warning(
        `${fileArr.length - validFiles.length} non-image file(s) skipped`
      );
    }
    if (!validFiles.length) return;

    setUploading(true);
    setUploads(
      validFiles.map((f) => ({ fileName: f.name, progress: 0 }))
    );

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      let i = 0;
      for (const file of validFiles) {
        const safe = file.name.replace(/[^a-z0-9.\-_]/gi, "_");
        const path = `${user.id}/${draft.id}/${Date.now()}-${safe}`;

        setUploads((prev) =>
          prev.map((u, idx) => (idx === i ? { ...u, progress: 15 } : u))
        );

        const { error: upErr } = await supabase.storage
          .from("listing-media")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
          });
        if (upErr) throw upErr;

        setUploads((prev) =>
          prev.map((u, idx) => (idx === i ? { ...u, progress: 70 } : u))
        );

        const recorded = await recordMediaUpload({
          listingId: draft.id,
          storagePath: path,
          type: "photo",
          isCover: media.length === 0 && i === 0,
          sortOrder: media.length + i,
        });

        setUploads((prev) =>
          prev.map((u, idx) => (idx === i ? { ...u, progress: 100 } : u))
        );

        setMedia((prev) => [
          ...prev,
          {
            id: recorded.id,
            public_url: recorded.public_url,
            storage_path: path,
            is_cover: media.length === 0 && i === 0,
          },
        ]);
        i++;
      }

      toast.success(
        `Uploaded ${validFiles.length} photo${validFiles.length === 1 ? "" : "s"}`
      );
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setTimeout(() => {
        setUploads([]);
        setUploading(false);
      }, 400);
    }
  }

  async function setCover(id: string) {
    const prev = media;
    setMedia((m) => m.map((x) => ({ ...x, is_cover: x.id === id })));
    try {
      await supabase
        .from("listing_media")
        .update({ is_cover: false })
        .eq("listing_id", draft.id);
      await supabase
        .from("listing_media")
        .update({ is_cover: true })
        .eq("id", id);
      toast.success("Cover photo updated");
    } catch (e: any) {
      setMedia(prev);
      toast.error("Failed to update cover");
    }
  }

  async function remove(id: string) {
    const prev = media;
    setMedia((m) => m.filter((x) => x.id !== id));
    try {
      await deleteMedia(id);
      toast.success("Photo deleted");
    } catch (e: any) {
      setMedia(prev);
      toast.error("Failed to delete");
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  }

  const canContinue =
    !busy && media.length >= 4 && media.some((m) => m.is_cover);
  const needed = Math.max(0, 4 - media.length);

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold">Step 3 â€” Photos</h2>
        <p className="text-sm text-slate-600">
          Add at least 4 photos. Click a photo to mark it as the cover image.
        </p>
      </header>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition ${
          isDragging
            ? "border-emerald-500 bg-emerald-50"
            : "border-slate-300 bg-slate-50 hover:bg-slate-100"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files && processFiles(e.target.files)}
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Spinner size="md" />
            <p className="text-sm font-medium text-slate-700">
              Uploading {uploads.length} photo{uploads.length === 1 ? "" : "s"}â€¦
            </p>
          </div>
        ) : (
          <>
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm text-lg">
              ðŸ“¸
            </div>
            <p className="text-sm font-medium text-slate-700">
              Drop photos here or click to browse
            </p>
            <p className="mt-1 text-xs text-slate-500">
              JPG, PNG Â· Multiple files supported
            </p>
          </>
        )}
      </div>

      {/* Per-file progress */}
      {uploads.length > 0 && (
        <div className="space-y-2 rounded-md border bg-white p-3">
          {uploads.map((u, i) => (
            <ProgressBar
              key={i}
              value={u.progress}
              label={u.fileName}
            />
          ))}
        </div>
      )}

      {/* Photo count status */}
      {media.length > 0 && (
        <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-xs">
          <span className="text-slate-700">
            <strong>{media.length}</strong> photo{media.length === 1 ? "" : "s"}
            {needed > 0 && ` Â· ${needed} more needed`}
          </span>
          {canContinue && (
            <span className="font-medium text-emerald-700">
              âœ“ Ready to continue
            </span>
          )}
        </div>
      )}

      {/* Photo grid */}
      {media.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {media.map((m) => (
            <div
              key={m.id}
              className={`group relative aspect-square overflow-hidden rounded-md border-2 transition ${
                m.is_cover ? "border-emerald-500" : "border-transparent"
              }`}
            >
              {m.public_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.public_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
              {m.is_cover && (
                <span className="absolute left-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                  â˜… Cover
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                {!m.is_cover && (
                  <button
                    type="button"
                    onClick={() => setCover(m.id)}
                    className="rounded bg-white/95 px-2 py-1 text-[10px] font-semibold text-slate-900 hover:bg-white"
                  >
                    Set cover
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(m.id)}
                  className="ml-auto rounded bg-red-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Nav */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          â† Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!canContinue}
          rightIcon={<span aria-hidden>â†’</span>}
        >
          Continue to disclosures
        </Button>
      </div>
    </section>
  );
}
