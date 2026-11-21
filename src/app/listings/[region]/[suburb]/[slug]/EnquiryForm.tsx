"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function EnquiryForm({ listingId }: { listingId: string }) {
  const pathname = usePathname();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setNeedsSignIn(false);
    try {
      const r = await fetch("/api/marketplace/enquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listingId, message }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) {
        setNeedsSignIn(true);
        throw new Error(j.error ?? "Please sign in to send a message.");
      }
      if (!r.ok) throw new Error(j.error ?? "Could not send");
      setConversationId(j.conversationId ?? null);
      setMessage("");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  if (conversationId) {
    return (
      <div className="mt-2 text-sm text-emerald-700">
        <p>{"\u2713 Message sent. The seller will reply in your VendorHub messages."}</p>
        <Link href={`/account/messages/${conversationId}`} className="mt-1 inline-block underline">
          View the conversation
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-2 space-y-2 text-sm">
      <textarea
        required
        minLength={10}
        maxLength={2000}
        rows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={"Hi \u2014 I'm interested in this property. Could you share\u2026"}
        className="w-full rounded border px-2 py-1.5 text-sm"
      />
      {err && <p className="text-xs text-red-600">{err}</p>}
      {needsSignIn && (
        <Link href={`/signin?redirect=${encodeURIComponent(pathname)}`} className="text-xs underline">
          Sign in
        </Link>
      )}
      <button
        disabled={busy}
        className="w-full rounded bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Sending\u2026" : "Send enquiry"}
      </button>
      <p className="text-[10px] text-muted-foreground">
        Sign in required. You&apos;ll need to verify your identity before submitting an offer.
      </p>
    </form>
  );
}