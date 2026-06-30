"use client";

import { useState } from "react";

export default function EnquiryForm({ listingId }: { listingId: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/marketplace/enquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listingId, message }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Could not send");
      setOk(true);
      setMessage("");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (ok) {
    return (
      <p className="mt-2 text-sm text-emerald-700">
        ✓ Enquiry sent. The seller will reply via VendorHub messaging.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-2 space-y-2 text-sm">
      <textarea
        required
        minLength={10}
        rows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Hi — I'm interested in this property. Could you share…"
        className="w-full rounded border px-2 py-1.5 text-sm"
      />
      {err && <p className="text-xs text-red-600">{err}</p>}
      <button
        disabled={busy}
        className="w-full rounded bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send enquiry"}
      </button>
      <p className="text-[10px] text-muted-foreground">
        Sign in required. You&apos;ll need to verify your identity before
        submitting an offer.
      </p>
    </form>
  );
}