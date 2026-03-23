// app/admin/listings/[id]/PhotoUploader.tsx
"use client";

import { useState } from "react";

type Props = { listingId: string };

export default function PhotoUploader({ listingId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    if (!file) {
      setError("Select a file first");
      return;
    }
    setBusy(true);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("listingId", listingId);

    const res = await fetch("/api/listings/upload", {
      method: "POST",
      body: fd,
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json?.error ?? "Upload failed");
      setBusy(false);
      return;
    }
    setOk(true);
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {ok && (
        <div className="rounded border border-green-300 bg-green-50 p-2 text-sm text-green-700">
          Uploaded
        </div>
      )}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm"
      />
      <button
        type="submit"
        disabled={busy || !file}
        className="rounded bg-slate-800 px-3 py-1.5 text-white text-sm disabled:opacity-60"
      >
        {busy ? "Uploading..." : "Upload"}
      </button>
    </form>
  );
}