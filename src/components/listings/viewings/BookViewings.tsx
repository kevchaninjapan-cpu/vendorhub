"use client";

import { useMemo, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { bookViewing, cancelViewing } from "@/lib/viewings/actions";
import type { AvailabilitySession, MyBooking } from "@/lib/viewings/schema";
import { buildSlots, formatNzDate, formatNzTime } from "@/lib/viewings/time";

type Pending = { sessionId: string; slot: string | null } | null;

const inputClass = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2";

export default function BookViewings({
  sessions,
  myBookings,
  signedIn,
  isOwner,
  prefill,
}: {
  sessions: AvailabilitySession[];
  myBookings: MyBooking[];
  signedIn: boolean;
  isOwner: boolean;
  prefill: { name: string; phone: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = useState<Pending>(null);
  const [name, setName] = useState(prefill.name);
  const [phone, setPhone] = useState(prefill.phone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mine = useMemo(() => {
    const m = new Map<string, MyBooking>();
    for (const b of myBookings) if (b.open_home_id) m.set(b.open_home_id, b);
    return m;
  }, [myBookings]);

  const now = Date.now();

  function start(sessionId: string, slot: string | null) {
    setError(null);
    setSuccess(null);
    if (!signedIn) {
      router.push(`/auth/sign-in?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    setPending({ sessionId, slot });
  }

  async function handleBook(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pending) return;
    setBusy(true);
    setError(null);
    const res = await bookViewing({
      open_home_id: pending.sessionId,
      slot_starts_at: pending.slot,
      name,
      phone,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Booking failed. Please try again.");
      router.refresh();
      return;
    }
    setPending(null);
    setSuccess("You're booked. We've emailed you the details.");
    router.refresh();
  }

  async function handleCancel(viewingId: string) {
    if (!window.confirm("Cancel this booking? The seller will be told.")) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    const res = await cancelViewing(viewingId);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Couldn't cancel the booking.");
      return;
    }
    setSuccess("Booking cancelled.");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {success ? (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</p>
      ) : null}
      {error && !pending ? (
        <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      ) : null}

      <ul className="space-y-3">
        {sessions.map((s) => {
          const booking = mine.get(s.id);
          const isPrivate = s.kind === "private";
          const spotsLeft =
            !isPrivate && s.max_attendees != null ? Math.max(0, s.max_attendees - s.booked_count) : null;
          const full = spotsLeft === 0;
          const taken = new Set((s.taken_slots ?? []).map((t) => new Date(t).getTime()));
          const slots = isPrivate ? buildSlots(s.starts_at, s.ends_at, s.slot_minutes) : [];
          const freeCount = slots.filter((sl) => {
            const t = new Date(sl.start).getTime();
            return !taken.has(t) && t > now;
          }).length;

          return (
            <li key={s.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-slate-900">{formatNzDate(s.starts_at)}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {isPrivate ? "Private viewing" : "Open home"}
                </span>
              </div>
              <p className="text-sm text-slate-600">
                {formatNzTime(s.starts_at)} &ndash; {formatNzTime(s.ends_at)}
                {isPrivate ? ` \u00b7 ${s.slot_minutes}-minute slots` : ""}
              </p>
              {s.notes ? <p className="mt-1 text-xs text-slate-500">{s.notes}</p> : null}

              <div className="mt-3">
                {booking ? (
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-medium text-emerald-700">
                      {booking.slot_starts_at
                        ? `You're booked for ${formatNzTime(booking.slot_starts_at)}`
                        : "You're attending"}
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleCancel(booking.id)}
                      className="text-xs text-slate-500 underline hover:text-rose-600 disabled:opacity-50"
                    >
                      Cancel booking
                    </button>
                  </div>
                ) : isOwner ? null : isPrivate ? (
                  freeCount === 0 ? (
                    <p className="text-sm text-slate-500">All times are booked.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {slots.map((sl) => {
                        const t = new Date(sl.start).getTime();
                        const unavailable = taken.has(t) || t <= now;
                        const selected = pending !== null && pending.sessionId === s.id && pending.slot === sl.start;
                        return (
                          <button
                            key={sl.start}
                            type="button"
                            disabled={unavailable || busy}
                            onClick={() => start(s.id, sl.start)}
                            className={
                              selected
                                ? "rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
                                : unavailable
                                  ? "rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-300 line-through"
                                  : "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-600"
                            }
                          >
                            {formatNzTime(sl.start)}
                          </button>
                        );
                      })}
                    </div>
                  )
                ) : full ? (
                  <p className="text-sm text-slate-500">This open home is full.</p>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => start(s.id, null)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      I&apos;ll attend
                    </button>
                    {spotsLeft != null ? (
                      <span className="text-xs text-slate-500">
                        {spotsLeft} {spotsLeft === 1 ? "spot" : "spots"} left
                      </span>
                    ) : null}
                  </div>
                )}
              </div>

              {pending !== null && pending.sessionId === s.id ? (
                <form onSubmit={handleBook} className="mt-4 space-y-3 rounded-lg bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-900">
                    {pending.slot ? `Book ${formatNzTime(pending.slot)}` : "Confirm you'll attend"}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="font-medium text-slate-700">Your name</span>
                      <input
                        required
                        maxLength={100}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={inputClass}
                      />
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
                    Your name and phone number will be shared with the seller so they know who&apos;s coming.
                  </p>
                  {error ? <p className="text-sm text-rose-600">{error}</p> : null}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={busy}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busy ? "Booking..." : "Confirm booking"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPending(null);
                        setError(null);
                      }}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
                    >
                      Back
                    </button>
                  </div>
                </form>
              ) : null}
            </li>
          );
        })}
      </ul>

      {!signedIn ? <p className="text-xs text-slate-500">Sign in to book a time.</p> : null}
    </div>
  );
}