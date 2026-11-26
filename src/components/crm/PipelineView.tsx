"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/documents/schema";
import { addTask, deleteTask, setTaskDone, updateLead } from "@/lib/crm/actions";
import { formatNzDate } from "@/lib/viewings/time";
import { formatDateOnly } from "@/lib/viewings/request-schema";

export type Stage = "enquired" | "viewing_booked" | "viewed" | "offer_made" | "negotiating" | "accepted" | "lost";
export type Task = { id: string; title: string; due_on: string; done: boolean };
export type Lead = {
  listing_id: string;
  buyer_id: string;
  listing_title: string;
  full: boolean;
  name: string;
  phone: string | null;
  auto_stage: Stage;
  stage: Stage;
  stage_is_manual: boolean;
  temperature: "hot" | "warm" | "cold" | null;
  notes: string | null;
  last_contact_at: string | null;
  conversation_id: string | null;
  offer_status: string | null;
  offer_amount: number | null;
  offer_by: "buyer" | "seller" | null;
  tasks: Task[];
};
export type DueTask = { id: string; title: string; due_on: string; listing_id: string; buyer_id: string; overdue: boolean };
export type PipelineData = {
  today: string;
  listings: { id: string; title: string; tier: string; full: boolean }[];
  leads: Lead[];
  due: DueTask[];
};

const STAGES: { key: Stage; label: string }[] = [
  { key: "enquired", label: "Enquired" },
  { key: "viewing_booked", label: "Viewing booked" },
  { key: "viewed", label: "Viewed" },
  { key: "offer_made", label: "Offer made" },
  { key: "negotiating", label: "Negotiating" },
  { key: "accepted", label: "Accepted" },
  { key: "lost", label: "Lost" },
];
const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.key, s.label])) as Record<Stage, string>;

const TEMP: Record<"hot" | "warm" | "cold", { label: string; cls: string }> = {
  hot: { label: "Hot", cls: "bg-rose-100 text-rose-700" },
  warm: { label: "Warm", cls: "bg-amber-100 text-amber-800" },
  cold: { label: "Cold", cls: "bg-sky-100 text-sky-800" },
};

const leadKey = (l: { listing_id: string; buyer_id: string }) => `${l.listing_id}:${l.buyer_id}`;
const money = (n: number) => "NZ$" + Number(n).toLocaleString("en-NZ");

function useAct() {
  const router = useRouter();
  const [pending, start] = useTransition();
  function act(fn: () => Promise<ActionResult<null>>, success?: string) {
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error ?? "Something went wrong.");
        return;
      }
      if (success) toast.success(success);
      router.refresh();
    });
  }
  return { pending, act };
}

export default function PipelineView({ data }: { data: PipelineData }) {
  const [listing, setListing] = useState("all");
  const [view, setView] = useState<"list" | "board">("list");
  const [open, setOpen] = useState<string | null>(null);

  const leads = useMemo(
    () => (listing === "all" ? data.leads : data.leads.filter((l) => l.listing_id === listing)),
    [data.leads, listing]
  );
  const byKey = useMemo(() => new Map(data.leads.map((l) => [leadKey(l), l])), [data.leads]);
  const anyFull = data.listings.some((l) => l.full);

  if (data.leads.length === 0) {
    return (
      <div className="rounded-2xl border bg-slate-50 p-6 text-sm text-slate-600">
        No buyers yet. When buyers enquire, book a viewing or make an offer on your listings, they&apos;ll appear here.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {data.due.length > 0 ? <DuePanel due={data.due} byKey={byKey} today={data.today} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          value={listing}
          onChange={(e) => setListing(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All listings ({data.leads.length} buyers)</option>
          {data.listings.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
        <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm">
          <button
            type="button"
            onClick={() => setView("list")}
            className={view === "list" ? "rounded-md bg-slate-900 px-3 py-1.5 text-white" : "px-3 py-1.5 text-slate-700"}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => setView("board")}
            disabled={!anyFull}
            title={anyFull ? "" : "The board comes with Pro and Elite"}
            className={
              view === "board"
                ? "rounded-md bg-slate-900 px-3 py-1.5 text-white"
                : "px-3 py-1.5 text-slate-700 disabled:opacity-40"
            }
          >
            Board
          </button>
        </div>
      </div>

      {view === "board" ? (
        <Board
          leads={leads.filter((l) => l.full)}
          showListing={listing === "all"}
          onDetails={(k) => {
            setView("list");
            setOpen(k);
          }}
        />
      ) : leads.length === 0 ? (
        <p className="rounded-2xl border bg-slate-50 p-6 text-sm text-slate-600">No buyers on this listing yet.</p>
      ) : (
        <ul className="space-y-3">
          {leads.map((l) => (
            <LeadCard
              key={leadKey(l)}
              lead={l}
              today={data.today}
              showListing={listing === "all"}
              isOpen={open === leadKey(l)}
              onToggle={() => setOpen(open === leadKey(l) ? null : leadKey(l))}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function DuePanel({ due, byKey, today }: { due: DueTask[]; byKey: Map<string, Lead>; today: string }) {
  const { pending, act } = useAct();
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <h2 className="text-base font-semibold text-slate-900">Follow up today</h2>
      <ul className="mt-3 space-y-2">
        {due.map((t) => {
          const lead = byKey.get(leadKey(t));
          return (
            <li key={t.id} className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                disabled={pending}
                onChange={() => act(() => setTaskDone(t.id, true), "Task done")}
                className="mt-1"
                aria-label="Mark done"
              />
              <div>
                <p className="text-slate-900">{t.title}</p>
                <p className="text-xs text-slate-600">
                  {lead ? `${lead.name} \u00b7 ${lead.listing_title}` : ""}
                  {" \u00b7 "}
                  <span className={t.overdue ? "font-medium text-rose-700" : ""}>
                    {t.due_on === today ? "Due today" : `Overdue since ${formatDateOnly(t.due_on)}`}
                  </span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Board({
  leads,
  showListing,
  onDetails,
}: {
  leads: Lead[];
  showListing: boolean;
  onDetails: (key: string) => void;
}) {
  const { pending, act } = useAct();
  if (leads.length === 0) {
    return (
      <p className="rounded-2xl border bg-slate-50 p-6 text-sm text-slate-600">
        The board shows buyers on your Pro and Elite listings.
      </p>
    );
  }
  return (
    <div className="grid auto-cols-[minmax(13rem,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2">
      {STAGES.map((s) => {
        const col = leads.filter((l) => l.stage === s.key);
        return (
          <div key={s.key} className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {s.label} ({col.length})
            </p>
            <ul className="mt-2 space-y-2">
              {col.map((l) => (
                <li key={leadKey(l)} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-slate-900">{l.name}</p>
                    {l.temperature ? (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TEMP[l.temperature].cls}`}>
                        {TEMP[l.temperature].label}
                      </span>
                    ) : null}
                  </div>
                  {showListing ? <p className="truncate text-xs text-slate-500">{l.listing_title}</p> : null}
                  <select
                    value={l.stage}
                    disabled={pending}
                    onChange={(e) => act(() => updateLead(l.listing_id, l.buyer_id, { stage: e.target.value }))}
                    className="mt-2 w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                    aria-label="Move to stage"
                  >
                    {STAGES.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onDetails(leadKey(l))}
                    className="mt-2 text-xs text-emerald-700 underline"
                  >
                    Details
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function LeadCard({
  lead,
  today,
  showListing,
  isOpen,
  onToggle,
}: {
  lead: Lead;
  today: string;
  showListing: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { pending, act } = useAct();
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState(today);

  const offerText =
    lead.offer_amount != null && lead.offer_status
      ? `${money(lead.offer_amount)}${lead.offer_by === "seller" ? " (your counter)" : ""} \u00b7 ${lead.offer_status}`
      : null;

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4">
      <button type="button" onClick={onToggle} className="flex w-full flex-wrap items-start justify-between gap-3 text-left">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900">{lead.name}</p>
            {lead.temperature ? (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TEMP[lead.temperature].cls}`}>
                {TEMP[lead.temperature].label}
              </span>
            ) : null}
          </div>
          {showListing ? <p className="truncate text-xs text-slate-500">{lead.listing_title}</p> : null}
          <p className="mt-1 text-xs text-slate-500">
            {lead.last_contact_at ? `Last contact ${formatNzDate(lead.last_contact_at)}` : "No contact yet"}
            {offerText ? ` \u00b7 Offer ${offerText}` : ""}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
          {STAGE_LABEL[lead.stage]}
          {lead.stage_is_manual ? " (set by you)" : ""}
        </span>
      </button>

      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        {lead.conversation_id ? (
          <Link href={`/account/messages/${lead.conversation_id}`} className="text-emerald-700 underline">
            Message
          </Link>
        ) : null}
        {lead.offer_status ? (
          <Link href="/account/offers" className="text-emerald-700 underline">
            Offers
          </Link>
        ) : null}
        {lead.phone ? (
          <a href={`tel:${lead.phone.replace(/\s+/g, "")}`} className="text-emerald-700 underline">
            Call {lead.phone}
          </a>
        ) : null}
      </div>

      {isOpen ? (
        <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Label</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {(["hot", "warm", "cold"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={pending}
                  onClick={() => act(() => updateLead(lead.listing_id, lead.buyer_id, { temperature: t }))}
                  className={
                    lead.temperature === t
                      ? `rounded-full px-3 py-1 text-xs font-semibold ${TEMP[t].cls}`
                      : "rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700"
                  }
                >
                  {TEMP[t].label}
                </button>
              ))}
              {lead.temperature ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => act(() => updateLead(lead.listing_id, lead.buyer_id, { temperature: "none" }))}
                  className="text-xs text-slate-500 underline"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes (only you see these)</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={4000}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. Pre-approved, wants to settle before March"
            />
            <button
              type="button"
              disabled={pending || notes === (lead.notes ?? "")}
              onClick={() => act(() => updateLead(lead.listing_id, lead.buyer_id, { notes }), "Notes saved")}
              className="mt-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
            >
              Save notes
            </button>
          </div>

          {lead.full ? (
            <>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stage</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <select
                    value={lead.stage}
                    disabled={pending}
                    onChange={(e) => act(() => updateLead(lead.listing_id, lead.buyer_id, { stage: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  >
                    {STAGES.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {lead.stage_is_manual ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => act(() => updateLead(lead.listing_id, lead.buyer_id, { clearStage: true }))}
                      className="text-xs text-slate-500 underline"
                    >
                      Back to automatic ({STAGE_LABEL[lead.auto_stage]})
                    </button>
                  ) : (
                    <span className="text-xs text-slate-500">Updates automatically</span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Follow-ups</p>
                {lead.tasks.length > 0 ? (
                  <ul className="mt-1 space-y-1">
                    {lead.tasks.map((t) => (
                      <li key={t.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={t.done}
                          disabled={pending}
                          onChange={(e) => act(() => setTaskDone(t.id, e.target.checked))}
                          aria-label="Done"
                        />
                        <span className={t.done ? "text-slate-400 line-through" : "text-slate-800"}>{t.title}</span>
                        <span className={!t.done && t.due_on < today ? "text-xs text-rose-700" : "text-xs text-slate-500"}>
                          {formatDateOnly(t.due_on)}
                        </span>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => act(() => deleteTask(t.id))}
                          className="text-xs text-slate-400 hover:text-rose-600"
                          aria-label="Delete task"
                        >
                          &times;
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  <input
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    maxLength={200}
                    placeholder="e.g. Call about second viewing"
                    className="min-w-[14rem] flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                  />
                  <input
                    type="date"
                    value={taskDue}
                    min={today}
                    onChange={(e) => setTaskDue(e.target.value)}
                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    disabled={pending || !taskTitle.trim()}
                    onClick={() =>
                      act(async () => {
                        const res = await addTask(lead.listing_id, lead.buyer_id, taskTitle, taskDue);
                        if (res.ok) setTaskTitle("");
                        return res;
                      }, "Follow-up added")
                    }
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">We&apos;ll email you on the morning a follow-up is due.</p>
              </div>
            </>
          ) : (
            <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              Pipeline stages, follow-up tasks and reminder emails come with the Pro and Elite packs.
            </p>
          )}
        </div>
      ) : null}
    </li>
  );
}