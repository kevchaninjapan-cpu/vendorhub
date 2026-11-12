"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  confirmViewingRequest,
  declineViewingRequest,
  setAcceptsViewingRequests,
} from "@/lib/viewings/requests";
import {
  REQUEST_LENGTH_OPTIONS,
  REQUEST_STATUS_LABELS,
  describeAvailability,
  formatDateOnly,
  isOpenRequest,
  isoWeekday,
  matchingDates,
  toMinutes,
  type OwnerRequest,
} from "@/lib/viewings/request-schema";
import { formatNzRange, nzToday } from "@/lib/viewings/time";
import MessageThread from "./MessageThread";

type Notice = { kind: "ok" | "error"; text: string } | null;

const inputClass = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2";

export default function RequestsManager({
  listingId,
  sellerId,
  accepts,
  requests,
}: {
  listingId: string;
  sellerId: string;
  accepts: boolean;
  requests: OwnerRequest[];
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(accepts);
  const [toggling, setToggling] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const open = requests.filter((r) => isOpenRequest(r.status));
  const earlier = requests.filter((r) => !isOpenRequest(r.status)).slice(0, 10);

  async function toggle() {
    const next = !enabled;
    setToggling(true);
    setNotice(null);
    const res = await setAcceptsViewingRequests(listingId, next);
    setToggling(false);
    if (!res.ok) {
      setNotice({ kind: "error", text: res.error ?? "Couldn't change the setting." });
      return;
    }
    setEnabled(next);
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">Viewing requests</h2>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={enabled} disabled={toggling} onChange={toggle} />
          Accept private viewing requests
        </label>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Buyers tell you the days and times they&apos;re free. Confirm a time inside their window and it&apos;s
        booked straight away; suggest one outside it and they&apos;ll need to accept.
      </p>

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

      {open.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No open requests.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {open.map((r) => (
            <RequestCard key={r.id} request={r} sellerId={sellerId} onNotice={setNotice} />
          ))}
        </ul>
      )}

      {earlier.length > 0 ? (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            Earlier requests ({earlier.length})
          </summary>
          <ul className="mt-3 space-y-3">
            {earlier.map((r) => (
              <li key={r.id} className="rounded-xl border border-slate-200 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-900">{r.buyer_name}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {REQUEST_STATUS_LABELS[r.status]}
                  </span>
                </div>
                {r.status === "confirmed" && r.proposed_starts_at && r.proposed_ends_at ? (
                  <p className="mt-1 text-xs text-slate-600">
                    {formatNzRange(r.proposed_starts_at, r.proposed_ends_at)}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">{describeAvailability(r)}</p>
                )}
                {r.thread ? <MessageThread thread={r.thread} viewerId={sellerId} otherLabel={r.buyer_name} /> : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function RequestCard({
  request: r,
  sellerId,
  onNotice,
}: {
  request: OwnerRequest;
  sellerId: string;
  onNotice: (n: Notice) => void;
}) {
  const router = useRouter();
  const today = nzToday();
  const dates = useMemo(() => matchingDates(r, today), [r, today]);
  const [date, setDate] = useState(dates[0] ?? "");
  const [time, setTime] = useState(r.time_from.slice(0, 5));
  const [minutes, setMinutes] = useState(30);
  const [busy, setBusy] = useState(false);

  const inside =
    date !== "" &&
    time !== "" &&
    date >= r.date_from &&
    date <= r.date_to &&
    r.days.includes(isoWeekday(date)) &&
    toMinutes(time) >= toMinutes(r.time_from) &&
    toMinutes(time) + minutes <= toMinutes(r.time_to);

  async function handleConfirm() {
    if (!date || !time) {
      onNotice({ kind: "error", text: "Choose a date and time first." });
      return;
    }
    setBusy(true);
    onNotice(null);
    const res = await confirmViewingRequest(r.id, date, time, minutes);
    setBusy(false);
    if (!res.ok) {
      onNotice({ kind: "error", text: res.error ?? "Couldn't save that time." });
      return;
    }
    onNotice({
      kind: "ok",
      text:
        res.data?.status === "confirmed"
          ? `Viewing confirmed with ${r.buyer_name}. It's now under Upcoming.`
          : `Suggested time sent to ${r.buyer_name}.`,
    });
    router.refresh();
  }

  async function handleDecline() {
    const reason = window.prompt(
      `Decline ${r.buyer_name}'s request? You can add a short message for them (optional).`,
      ""
    );
    if (reason === null) return;
    setBusy(true);
    onNotice(null);
    const res = await declineViewingRequest(r.id, reason);
    setBusy(false);
    if (!res.ok) {
      onNotice({ kind: "error", text: res.error ?? "Couldn't decline the request." });
      return;
    }
    onNotice({ kind: "ok", text: "Request declined." });
    router.refresh();
  }

  return (
    <li className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-900">{r.buyer_name}</p>
          <a href={`tel:${r.buyer_phone.replace(/\s+/g, "")}`} className="text-sm text-emerald-700 underline">
            {r.buyer_phone}
          </a>
        </div>
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
          {REQUEST_STATUS_LABELS[r.status]}
        </span>
      </div>

      <p className="mt-2 text-sm text-slate-700">
        <span className="font-medium">Available:</span> {describeAvailability(r)}
      </p>
      {r.note ? <p className="mt-1 text-sm text-slate-600">&ldquo;{r.note}&rdquo;</p> : null}

      {r.status === "proposed" && r.proposed_starts_at && r.proposed_ends_at ? (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          You suggested {formatNzRange(r.proposed_starts_at, r.proposed_ends_at)}. Waiting for the buyer to accept.
          You can suggest a different time below.
        </p>
      ) : null}

      <div className="mt-3">
        <p className="text-xs font-medium text-slate-700">Days that suit the buyer</p>
        {dates.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-2">
            {dates.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDate(d)}
                className={
                  d === date
                    ? "rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
                    : "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-600"
                }
              >
                {formatDateOnly(d)}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-xs text-slate-500">
            None of the buyer&apos;s days are left. Pick another date below to suggest one.
          </p>
        )}

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Date</span>
            <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Start</span>
            <input type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Length</span>
            <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className={inputClass}>
              {REQUEST_LENGTH_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
          </label>
        </div>

        {date && time ? (
          <p className={inside ? "mt-2 text-xs text-emerald-700" : "mt-2 text-xs text-amber-700"}>
            {inside
              ? "Inside the buyer's availability, so it will be booked straight away."
              : "Outside the buyer's availability, so they'll need to accept it first."}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy || !date || !time}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? "Saving..." : inside ? "Confirm viewing" : "Suggest this time"}
          </button>
          <button
            type="button"
            onClick={handleDecline}
            disabled={busy}
            className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      </div>

      {r.thread ? <MessageThread thread={r.thread} viewerId={sellerId} otherLabel={r.buyer_name} /> : null}
    </li>
  );
}