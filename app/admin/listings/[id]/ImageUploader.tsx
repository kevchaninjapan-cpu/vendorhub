"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type UploadResult = {
  image?: {
    id: string;
    listing_id: string;
    storage_path: string;
    alt: string | null;
    sort_order: number | null;
    is_cover: boolean | null;
    created_at: string | null;
  };
  publicUrl?: string | null;
  error?: string;
};

export default function ImageUploader({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [isCover, setIsCover] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  const canSubmit = useMemo(() => !!file && !isPending, [file, isPending]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLastUrl(null);

    if (!file) {
      setError("Please select an image file first.");
      return;
    }

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("alt", alt);
      fd.append("is_cover", isCover ? "true" : "false");

      const res = await fetch(`/api/admin/listings/${listingId}/images`, {
        method: "POST",
        body: fd,
      });

      const json = (await res.json()) as UploadResult;

      if (!res.ok) {
        throw new Error(json?.error || "Upload failed");
      }

      setSuccess("Uploaded successfully.");
      setLastUrl(json.publicUrl ?? null);

      // Reset input (optional)
      setFile(null);
      setAlt("");

      // Refresh server components so any gallery / cover display updates
      startTransition(() => router.refresh());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-5 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Upload listing photo</h3>
        <p className="text-sm text-muted-foreground">
          Uploads to <code>listing-photos</code> and inserts a row in{" "}
          <code>listing_images</code>.
        </p>
      </div>

      <form onSubmit={handleUpload} className="space-y-4">
        {/* File picker */}
        <div className="space-y-1">
          <label className="block text-sm font-medium">Image file</label>
          <input
            type="file"
            accept="image/*"
            className="block w-full text-sm"
            onChange={(ev) => {
              const f = ev.target.files?.[0] ?? null;
              setFile(f);
              setError(null);
              setSuccess(null);
              setLastUrl(null);
            }}
          />
          {file ? (
            <div className="text-xs text-muted-foreground">
              Selected: <span className="font-medium">{file.name}</span> •{" "}
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
          ) : null}
        </div>

        {/* Alt text */}
        <div className="space-y-1">
          <label className="block text-sm font-medium">Alt text (optional)</label>
          <input
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="e.g. Front exterior at sunset"
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20"
          />
        </div>

        {/* Cover toggle */}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isCover}
            onChange={(e) => setIsCover(e.target.checked)}
          />
          Set as cover image
        </label>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className={[
              "rounded-xl bg-black px-4 py-2 text-sm font-medium text-white",
              !canSubmit ? "opacity-50 cursor-not-allowed" : "hover:bg-black/90",
            ].join(" ")}
          >
            {isPending ? "Uploading..." : "Upload"}
          </button>

          <button
            type="button"
            className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted"
            onClick={() => {
              setFile(null);
              setAlt("");
              setIsCover(true);
              setError(null);
              setSuccess(null);
              setLastUrl(null);
            }}
          >
            Reset
          </button>
        </div>

        {/* Status messages */}
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {success}
          </div>
        ) : null}

        {/* Preview of the last uploaded URL (if bucket is public) */}
        {lastUrl ? (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              Public URL:{" "}
              <a className="underline" href={lastUrl} target="_blank" rel="noreferrer">
                open
              </a>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lastUrl}
              alt={alt || "Uploaded listing photo"}
              className="w-full max-w-xl rounded-2xl border"
            />
          </div>
        ) : null}
      </form>
    </div>
  );
}