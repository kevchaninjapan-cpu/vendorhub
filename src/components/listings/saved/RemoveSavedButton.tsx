"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { removeSavedListing } from "@/lib/saved/actions";

export default function RemoveSavedButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    const res = await removeSavedListing(listingId);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Couldn't remove that home.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="text-xs text-slate-500 underline hover:text-rose-600 disabled:opacity-50"
      >
        {busy ? "Removing\u2026" : "Remove"}
      </button>
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}