"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { acceptOffer, counterOffer, declineOffer } from "@/lib/offers/client";
import { formatNzDate, formatNzTime } from "@/lib/viewings/time";

export type OfferStep = {
  id: string;
  amount: number;
  proposed_by: "buyer" | "seller";
  status: string;
  conditions: string[];
  settlement_date: string | null;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
};

export type Negotiation = {
  key: string;
  listing_id: string;
  role: "buyer" | "seller";
  listing_title: string;
  listing_slug: string | null;
  listing_region: string | null;
  listing_suburb: string | null;
  listing_status: string;
  other_name: string;
  conversation_id: string | null;
  my_turn: boolean;
  offers: OfferStep[];
};

const CONDITION_LABELS: Record<string, string> = {
  finance: "Finance",
  building_report: "Building report",
  lim: "LIM",
};

const money = (n: number) => "NZ$" + Number(n).toLocaleString("en-NZ");
const toSlug = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "-");
const dateOnly = (d: string) =>
  new Date(d + "T00:00:00Z").toLocaleDateString("en-NZ", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
const conditionsText = (c: string[]) =>
  c.length === 0 ? "Unconditional" : c.map((x) => CONDITION_LABELS[x] ?? x).join(", ");

const CLOSED: Record<string, { text: string; cls: string }> = {
  accepted: { text: "Accepted", cls: "bg-emerald-100 text-emerald-800" },
  declined: { text: "Declined", cls: "bg-slate-100 text-slate-700" },
  withdrawn: { text: "Withdrawn", cls: "bg-slate-100 text-slate-700" },
  expired: { text: "Expired", cls: "bg-slate-100 text-slate-500" },
};

export default function NegotiationsBoard({ items, emptyText }: { items: Negotiation[]; emptyText: string }) {
  if (items.length === 0) {
    return <div className="rounded-2xl border bg-slate-50 p-6 text-center text-sm text-slate-600">{emptyText}</div>;
  }
  return (
    <ul className="space-y-4">
      {items.map((n) => (
        <Thread key={n.key} n={n} />
      ))}
    </ul>
  );
}

function Thread({ n }: { n: Negotiation }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [showCounter, setShowCounter] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const latest = n.offers[n.offers.length - 1];
  if (!latest) return null;
  const active = latest.status === "submitted";
  const otherShort = n.role === "seller" ? n.other_name : "the seller";
  const who = (p: "buyer" | "seller") => (p === n.role ? "You" : n.role === "seller" ? n.other_name : "The seller");

  const pill = active
    ? n.my_turn
      ? { text: "Your turn", cls: "bg-amber-100 text-amber-800" }
      : { text: `Waiting for ${otherShort}`, cls: "bg-blue-100 text-blue-800" }
    : CLOSED[latest.status] ?? { text: latest.status, cls: "bg-slate-100 text-slate-700" };

  const href =
    n.listing_slug && n.listing_region && n.listing_suburb
      ? `/listings/${toSlug(n.listing_region)}/${toSlug(n.listing_suburb)}/${n.listing_slug}`
      : null;

  function fail(e: unknown, fallback: string) {
    toast.error(e instanceof Error ? e.message : fallback);
  }

  function doAccept() {
    const msg =
      n.role === "seller"
        ? `Accept ${money(latest.amount)}? Other active offers on this listing will be declined.`
        : `Accept the seller's counter-offer of ${money(latest.amount)}?`;
    if (!window.confirm(msg)) return;
    start(async () => {
      try {
        await acceptOffer(latest.id);
        toast.success("Offer accepted");
        router.refresh();
      } catch (e) {
        fail(e, "Couldn't accept the offer.");
      }
    });
  }

  function doDecline() {
    const reason = window.prompt(n.my_turn ? "Decline this offer? Add a reason (optional):" : "Withdraw your offer? Add a reason (optional):", "");
    if (reason === null) return;
    start(async () => {
      try {
        await declineOffer(latest.id, reason);
        toast.success(n.my_turn ? "Offer declined" : "Offer withdrawn");
        router.refresh();
      } catch (e) {
        fail(e, "Couldn't update the offer.");
      }
    });
  }

  function doCounter() {
    const amt = Number(amount.replace(/[^0-9.]/g, ""));
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    start(async () => {
      try {
        await counterOffer(latest.id, amt, note.trim() || undefined);
        toast.success("Counter-offer sent");
        setShowCounter(false);
        setAmount("");
        setNote("");
        router.refresh();
      } catch (e) {
        fail(e, "Couldn't send the counter-offer.");
      }
    });
  }

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {href ? (
            <Link href={href} className="block truncate font-semibold text-slate-900 hover:underline">
              {n.listing_title}
            </Link>
          ) : (
            <p className="truncate font-semibold text-slate-900">{n.listing_title}</p>
          )}
          <p className="text-xs text-slate-500">
            {n.role === "seller" ? `Negotiation with ${n.other_name}` : "Your negotiation with the seller"}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${pill.cls}`}>{pill.text}</span>
      </div>

      {active ? (
        <div className={n.my_turn ? "mt-4 rounded-xl bg-amber-50 p-4" : "mt-4 rounded-xl bg-slate-50 p-4"}>
          <p className="text-xs text-slate-500">
            {latest.proposed_by === n.role ? "Your latest offer" : `Latest offer from ${otherShort}`}
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{money(latest.amount)}</p>
          <div className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-3">
            <p>Conditions: {conditionsText(latest.conditions)}</p>
            {latest.settlement_date ? <p>Settlement: {dateOnly(latest.settlement_date)}</p> : null}
            {latest.expires_at ? (
              <p>
                Expires: {formatNzTime(latest.expires_at)}, {formatNzDate(latest.expires_at)}
              </p>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {n.my_turn ? (
              <>
                <button
                  type="button"
                  onClick={doAccept}
                  disabled={pending}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => setShowCounter((v) => !v)}
                  disabled={pending}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                >
                  Counter
                </button>
                <button
                  type="button"
                  onClick={doDecline}
                  disabled={pending}
                  className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                >
                  Decline
                </button>
              </>
            ) : (
              <>
                <p className="self-center text-sm text-slate-600">Waiting for {otherShort} to respond.</p>
                <button
                  type="button"
                  onClick={doDecline}
                  disabled={pending}
                  className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                >
                  Withdraw
                </button>
              </>
            )}
          </div>

          {showCounter && n.my_turn ? (
            <div className="mt-3 space-y-2 rounded-lg border border-amber-300 bg-white p-3">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Your counter-offer (NZ$)</span>
                <input
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={String(latest.amount)}
                  className="mt-1 w-48 rounded-lg border border-slate-300 px-3 py-2"
                  autoFocus
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Note (optional)</span>
                <input
                  value={note}
                  maxLength={500}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <p className="text-xs text-slate-500">Conditions, settlement date and expiry stay the same as the current offer.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={doCounter}
                  disabled={pending}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {pending ? "Sending\u2026" : "Send counter-offer"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCounter(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <ol className="mt-4 space-y-3 border-l-2 border-slate-100 pl-4">
        {n.offers.map((s, i) => {
          const prev = i > 0 ? n.offers[i - 1] : null;
          const diff = prev ? s.amount - prev.amount : 0;
          const label =
            s.status === "submitted" ? "Current" : s.status === "countered" ? "Countered" : CLOSED[s.status]?.text ?? s.status;
          return (
            <li key={s.id} className="relative text-sm">
              <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-slate-300" />
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-slate-800">
                  <span className="font-medium">{who(s.proposed_by)}</span> {i === 0 ? "offered" : "countered with"}{" "}
                  <span className="font-semibold">{money(s.amount)}</span>
                  {prev && diff !== 0 ? (
                    <span className="ml-1 text-xs text-slate-500">
                      ({diff > 0 ? "+" : "\u2212"}
                      {money(Math.abs(diff))})
                    </span>
                  ) : null}
                </p>
                <span className="text-xs text-slate-400">
                  {formatNzTime(s.created_at)}, {formatNzDate(s.created_at)} &middot; {label}
                </span>
              </div>
              {i === 0 ? (
                <p className="text-xs text-slate-500">
                  {conditionsText(s.conditions)}
                  {s.settlement_date ? ` \u00b7 settlement ${dateOnly(s.settlement_date)}` : ""}
                </p>
              ) : null}
              {s.notes ? <p className="mt-0.5 text-xs italic text-slate-600">&ldquo;{s.notes}&rdquo;</p> : null}
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        {n.conversation_id ? (
          <Link href={`/account/messages/${n.conversation_id}`} className="text-emerald-700 underline">
            Message {otherShort}
          </Link>
        ) : null}
        {latest.status === "accepted" ? (
          <p className="text-slate-600">
            Next step: arrange the sale and purchase agreement with your lawyer or conveyancer.
          </p>
        ) : null}
      </div>
    </li>
  );
}