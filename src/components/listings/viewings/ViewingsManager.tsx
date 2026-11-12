"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSession, cancelSession, cancelViewing } from "@/lib/viewings/actions";
import {
  DEFAULT_SLOT_MINUTES,
  SLOT_MINUTE_OPTIONS,
  VIEWING_KIND_LABELS,
  type OwnerSession,
  type ViewingKind,
} from "@/lib/viewings/schema";
import { formatNzDate, formatNzTime, nzToday } from "@/lib/viewings/time";

type Notice = { kind: "ok" | "error"; text: string } | null;

const inputClass = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2";

export default function ViewingsManager({
  listingId,
  sessions,
}: {
  listingId: string;
  sessions: OwnerSession[];
}) {
  const router = useRouter();
  const [kind, setKind] = useState<ViewingKind>("open_home");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [slotMinutes, setSlotMinutes] = useState<number>(DEFAULT_SLOT_MINUTES);
  const [maxAttendees, setMaxAttendees] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNotice(null);
    setSaving(true);

    const max = maxAttendees.trim() ? Number(maxAttendees) : null;
    const res = await createSession({
      listing_id: listingId,
      kind,
      date,
      start_time: startTime,
      end_time: endTime,
      slot_minutes: slotMinutes,
      max_attendees: kind === "open_home" && max && Number.isFinite(max) ? max : null,
      notes: notes.trim() || undefined,
    });

    setSaving(false);
    if (!res.ok) {
      setNotice({ kind: "error", text: res.error ?? "Couldn't save that session." });
      return;
    }
    setNotice({ kind: "ok", text: `${VIEWING_KIND_LABELS[kind]} added.` });
    setDate("");
    setStartTime("");
    setEndTime("");
    setMaxAttendees("");
    setNotes("");
    router.refresh();
  }

  async function handleCancelSession(s: OwnerSession) {
    const n = s.bookings.length;
    const msg =
      n === 0
        ? "Cancel this session?"
        : `Cancel this session? ${n} ${n === 1 ? "buyer is" : "buyers are"} booked and will be emailed.`;
    if (!window.confirm(msg)) return;

    setBusy(s.id);
    setNotice(null);
    const res = await cancelSession(s.id);
    setBusy(null);
    if (!res.ok) {
      setNotice({ kind: "error", text: res.error ?? "Couldn't cancel that session." });
      return;
    }
    setNotice({ kind: "ok", text: "Session cancelled." });
    router.refresh();
  }

  async function handleCancelBooking(id: string, name: string | null) {
    if (!window.confirm(`Cancel ${name ?? "this buyer"}'s booking? They will be emailed.`)) return;
    setBusy(id);
    setNotice(null);
    const res = await cancelViewing(id);
    setBusy(null);
    if (!res.ok) {
      setNotice({ kind: "error", text: res.error ?? "Couldn't cancel that booking." });
      return;
    }
    setNotice({ kind: "ok", text: "Booking cancelled." });
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleCreate} className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900">Add a time</h2>

        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          {(["open_home", "private"] as ViewingKind[]).map((k) => (
            <label key={k} className="flex items-center gap-2">
              <input type="radio" name="kind" checked={kind === k} onChange={() => setKind(k)} />
              <span className="font-medium text-slate-700">{VIEWING_KIND_LABELS[k]}</span>
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {kind === "open_home"
            ? "Buyers tell you they're coming. Anyone can attend during the time."
            : "The time is split into slots. Each buyer books one slot on their own."}
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Date</span>
            <input type="date" required min={nzToday()} value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Start</span>
            <input type="time" required step={300} value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Finish</span>
            <input type="time" required step={300} value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass} />
          </label>

          {kind === "private" ? (
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Slot length</span>
              <select value={slotMinutes} onChange={(e) => setSlotMinutes(Number(e.target.value))} className={inputClass}>
                {SLOT_MINUTE_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m} minutes
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Limit (optional)</span>
              <input
                type="number"
                min={1}
                max={500}
                placeholder="No limit"
                value={maxAttendees}
                onChange={(e) => setMaxAttendees(e.target.value)}
                className={inputClass}
              />
            </label>
          )}

          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">Note for buyers (optional)</span>
            <input
              type="text"
              maxLength={300}
              placeholder="e.g. Park on the street, please"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        <p className="mt-3 text-xs text-slate-500">All times are New Zealand time.</p>

        {notice ? (
          <p
            className={
              notice.kind === "ok"
                ? "mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
                : "mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700"
            }
          >
            {notice.text}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : `Add ${VIEWING_KIND_LABELS[kind].toLowerCase()}`}
        </button>
      </form>

      <section>
        <h2 className="text-base font-semibold text-slate-900">Upcoming</h2>

        {sessions.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Nothing scheduled yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {sessions.map((s) => (
              <li key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {formatNzDate(s.starts_at)}, {formatNzTime(s.starts_at)} &ndash; {formatNzTime(s.ends_at)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {s.kind === "private"
                        ? `Private viewings, ${s.slot_minutes}-minute slots`
                        : `Open home${s.max_attendees ? `, limit ${s.max_attendees}` : ""}`}
                      {" \u00b7 "}
                      {s.bookings.length} {s.bookings.length === 1 ? "booking" : "bookings"}
                    </p>
                    {s.notes ? <p className="mt-1 text-xs text-slate-500">{s.notes}</p> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCancelSession(s)}
                    disabled={busy === s.id}
                    className="self-start rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  >
                    Cancel session
                  </button>
                </div>

                {s.bookings.length > 0 ? (
                  <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-100">
                    {s.bookings.map((b) => (
                      <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                        <div>
                          {b.slot_starts_at ? (
                            <span className="mr-2 font-medium text-slate-900">{formatNzTime(b.slot_starts_at)}</span>
                          ) : null}
                          <span className="text-slate-700">{b.buyer_name ?? "Buyer"}</span>
                          {b.buyer_phone ? (
                            <a href={`tel:${b.buyer_phone.replace(/\s+/g, "")}`} className="ml-2 text-emerald-700 underline">
                              {b.buyer_phone}
                            </a>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCancelBooking(b.id, b.buyer_name)}
                          disabled={busy === b.id}
                          className="text-xs text-slate-500 underline hover:text-rose-600 disabled:opacity-50"
                        >
                          Cancel booking
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}