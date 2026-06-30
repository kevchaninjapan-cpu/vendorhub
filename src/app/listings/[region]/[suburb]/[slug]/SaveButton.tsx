"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function SaveButton({ listingId }: { listingId: string }) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("saved_listings")
        .select("id")
        .eq("user_id", user.id)
        .eq("listing_id", listingId)
        .maybeSingle();
      if (active) setSaved(!!data);
    })();
    return () => {
      active = false;
    };
  }, [listingId, supabase]);

  async function toggle() {
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = `/sign-in?next=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      if (saved) {
        await supabase
          .from("saved_listings")
          .delete()
          .eq("user_id", user.id)
          .eq("listing_id", listingId);
        setSaved(false);
      } else {
        await supabase
          .from("saved_listings")
          .insert({ user_id: user.id, listing_id: listingId });
        setSaved(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className="flex w-full items-center justify-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-semibold disabled:opacity-50"
    >
      <span>{saved ? "♥" : "♡"}</span>
      <span>{saved ? "Saved" : "Save this listing"}</span>
    </button>
  );
}