"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  acceptViewingProposal,
  createViewingRequest,
  withdrawViewingRequest,
} from "@/lib/viewings/requests";
import { cancelViewing } from "@/lib/viewings/actions";
import {
  DAY_LABELS,
  MAX_REQUEST_DAYS,
  REQUEST_STATUS_LABELS,
  addDays,
  daysBetween,
  describeAvailability,
  isOpenRequest,
  type BuyerRequestState,
} from "@/lib/viewings/request-schema";
import { formatNzRange, nzToday } from "@/lib/viewings/time";
import MessageThread from "./MessageThread";

const inputClass = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2";

export default function RequestViewing({
  listingId,
  signedIn,
  state,
  prefill,
}: {
  listingId: string;
  signedIn: boolean;
  state: BuyerRequestState;
  prefill: { name: string; phone: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const today = nzToday();
  const [nowMs] = useState(() => Date.now());

  const r = state.request;
  const isOpen = Boolean(r && isOpenRequest(r.status));
  const upcoming = Boolean(
    r &&
      r.status === "confirmed" &&
      r.proposed_starts_at &&
      new Date(r.proposed_starts_at).getTime() > nowMs
  );

  const [showForm, setShowForm] = useState(false);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(addDays(today, 14));
  const [days, setDays] = useState<number[]>([]);
  const [timeFrom, setTimeFrom] = useState("10:00");
  const [timeTo, setTimeTo] = useState("12:00");
  const [note, setNote] = useState("");
  const [name, setName] = useState(prefill.name);
  const [phone, setPhone] = useState(prefill.phone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!state.accepts && !isOpen && !upcoming && !state.thread) return null;

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)));
  }

  function openForm() {
    setError(null);
    setSuccess(null);
    if (!signedIn) {
      router.push(`/signin?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (days.length === 0) {
      setError("Choose at least one day.");
      return;
    }
    if (dateTo < dateFrom) {
      setError("The end date must be on or after the start date.");
      return;
    }
    if (daysBetween(dateFrom, dateTo) > MAX_REQUEST_DAYS) {
      setError(`Please choose a range of up to ${MAX_REQUEST_DAYS} days.`);
      return;
    }
    if (timeTo <= timeFrom) {
      setError("The latest time must be after the earliest time.");
      return;
    }
    setBusy(true);
    const res = await createViewingRequest({
      listing_id: listingId,
      date_from: dateFrom,
      date_to: dateTo,
      days,
      time_from: timeFrom,
      time_to: timeTo,
      note: note.trim() || undefined,
      name,
      phone,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Couldn't send the request.");
      return;
    }
    setShowForm(false);
    setNote("");
    setSuccess("Request sent. The seller will confirm a time or reply in the messages below.");
    router.refresh();
  }

  async function handleAccept() {
    if (!r) return;
    setBusy(true);
    setError(null);
    const res = await acceptViewingProposal(r.id);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Couldn't accept that time.");
      router.refresh();
      return;
    }
    setSuccess("You're booked. We've emailed the seller.");
    router.refresh();
  }

  async function handleWithdraw() {
    if (!r) return;
    if (!window.confirm("Withdraw your viewing request? The seller will be told.")) return;
    setBusy(true);
    setError(null);
    const res = await withdrawViewingRequest(r.id);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Couldn't withdraw the request.");
      return;
    }
    setSuccess("Request withdrawn.");
    router.refresh();
  }

  async function handleCancelBooking() {
    if (!r || !r.viewing_id) return;
    if (!window.confirm("Cancel this viewing? The seller will be told.")) return;
    setBusy(true);
    setError(null);
    const res = await cancelViewing(r.viewing_id);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Couldn't cancel the viewing.");
      return;
    }
    setSuccess("Viewing cancelled.");
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Private viewing</h2>

      {success ? (
        <p className="mt-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</p>
      ) : null}
      {error && !showForm ? (
        <p className="mt-3 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      ) : null}

      {r && isOpen ? (
        <div className="mt-3 rounded-xl border border-slate-200 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-slate-900">Your request</span>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
              {REQUEST_STATUS_LABELS[r.status]}
            </span>
          </div>
          <p className="mt-1 text-slate-600">{describeAvailability(r)}</p>

          {r.status === "proposed" && r.proposed_starts_at && r.proposed_ends_at ? (
            <div className="mt-3 rounded-lg bg-amber-50 p-3">
              <p className="text-amber-900">
                The seller suggested <strong>{formatNzRange(r.proposed_starts_at, r.proposed_ends_at)}</strong>.
              </p>
              <button
                type="button"
                onClick={handleAccept}
                disabled={busy}
                className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy ? "Booking..." : "Accept this time"}
              </button>
              <p className="mt-2 text-xs text-amber-800">
                Doesn&apos;t suit? Reply in the messages below.
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleWithdraw}
            disabled={busy}
            className="mt-3 text-xs text-slate-500 underline hover:text-rose-600 disabled:opacity-50"
          >
            Withdraw request
          </button>
        </div>
      ) : null}

      {r && upcoming && r.proposed_starts_at && r.proposed_ends_at ? (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <p className="text-emerald-900">
            Your private viewing is confirmed for{" "}
            <strong>{formatNzRange(r.proposed_starts_at, r.proposed_ends_at)}</strong>.
          </p>
          <button
            type="button"
            onClick={handleCancelBooking}
            disabled={busy}
            className="mt-2 text-xs text-slate-600 underline hover:text-rose-600 disabled:opacity-50"
          >
            Cancel viewing
          </button>
        </div>
      ) : null}

      {!isOpen && state.accepts ? (
        showForm ? (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">From</span>
                <input
                  type="date"
                  required
                  min={today}
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">To</span>
                <input
                  type="date"
                  required
                  min={dateFrom}
                  max={addDays(dateFrom, MAX_REQUEST_DAYS)}
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700">Days you&apos;re free</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {DAY_LABELS.map((label, i) => {
                  const d = i + 1;
                  const on = days.includes(d);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className={
                        on
                          ? "rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
                          : "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-600"
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Earliest</span>
                <input
                  type="time"
                  required
                  step={900}
                  value={timeFrom}
                  onChange={(e) => setTimeFrom(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Latest</span>
                <input
                  type="time"
                  required
                  step={900}
                  value={timeTo}
                  onChange={(e) => setTimeTo(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>

            <label className="block text-sm">
              <span className="font-medium text-slate-700">Note for the seller (optional)</span>
              <textarea
                rows={2}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={inputClass}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Your name</span>
                <input required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Phone</span>
                <input
                  type="tel"
                  required
                  maxLength={30}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>

            <p className="text-xs text-slate-500">
              Your name and phone number will be shared with the seller. All times are New Zealand time.
            </p>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy ? "Sending..." : "Send request"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setError(null);
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
              >
                Back
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-3">
            {r && r.status === "declined" ? (
              <p className="mb-2 text-sm text-slate-500">Your last request was declined.</p>
            ) : null}
            <p className="text-sm text-slate-600">
              Can&apos;t make the listed times? Tell the seller when you&apos;re free.
            </p>
            <button
              type="button"
              onClick={openForm}
              className="mt-3 rounded-lg border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
            >
              Request a private viewing
            </button>
          </div>
        )
      ) : null}

      {state.thread && state.viewerId ? (
        <MessageThread thread={state.thread} viewerId={state.viewerId} otherLabel="Seller" />
      ) : null}
    </section>
  );
}