"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { recordMediaUpload, deleteMedia } from "@/lib/listings/actions";
import type { ListingDraft } from "@/types/marketplace";

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

export function Step3Media({ draft, busy, onBack, onNext }: Props) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [media, setMedia] = useState<MediaRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!draft.id) return;
    supabase.from("listing_media")
      .select("id, public_url, storage_path, is_cover")
      .eq("listing_id", draft.id)
      .order("sort_order")
      .then(({ data }) => setMedia((data ?? []) as MediaRow[]));
  }, [draft.id, supabase]);

  async function onFiles(files: FileList | null) {
    if (!files || !draft.id) return;
    setUploading(true); setErr(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      for (const file of Array.from(files)) {
        const safe = file.name.replace(/[^a-z0-9.\-_]/gi, "_");
        const path = `${user.id}/${draft.id}/${Date.now()}-${safe}`;
        const { error: upErr } = await supabase.storage
          .from("listing-media")
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;

        const recorded = await recordMediaUpload({
          listingId: draft.id,
          storagePath: path,
          type: "photo",
          isCover: media.length === 0,
          sortOrder: media.length,
        });
        setMedia(prev => [...prev, {
          id: recorded.id,
          public_url: recorded.public_url,
          storage_path: path,
          is_cover: media.length === 0,
        }]);
      }
    } catch (e: any) {
      setErr(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function setCover(id: string) {
    setMedia(prev => prev.map(m => ({ ...m, is_cover: m.id === id })));
    await supabase.from("listing_media")
      .update({ is_cover: false }).eq("listing_id", draft.id);
    await supabase.from("listing_media")
      .update({ is_cover: true }).eq("id", id);
  }

  async function remove(id: string) {
    await deleteMedia(id);
    setMedia(prev => prev.filter(m => m.id !== id));
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Step 3 — Photos</h2>
      <p className="text-sm text-muted-foreground">
        Add at least 4 photos. Tap a photo to mark it as the cover image.
      </p>

      <input
        type="file" multiple accept="image/*"
        onChange={(e) => onFiles(e.target.files)}
        disabled={uploading}
      />
      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {media.map((m) => (
          <div key={m.id} className="relative aspect-square overflow-hidden rounded-md border">
            {m.public_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.public_url} alt="" className="h-full w-full object-cover" />
            )}
            <button
              type="button"
              onClick={() => setCover(m.id)}
              className={[
                "absolute left-1 top-1 rounded px-2 py-0.5 text-xs",
                m.is_cover ? "bg-emerald-600 text-white" : "bg-white/80",
              ].join(" ")}
            >
              {m.is_cover ? "Cover" : "Set cover"}
            </button>
            <button
              type="button"
              onClick={() => remove(m.id)}
              className="absolute right-1 top-1 rounded bg-white/80 px-2 py-0.5 text-xs"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="text-sm underline">Back</button>
        <button
          type="button"
          disabled={busy || media.length < 4 || !media.some(m => m.is_cover)}
          onClick={onNext}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </section>
  );
}