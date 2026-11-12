"use client";

import { useState, useTransition } from "react";
import {
  updateEnquiryStatus,
  sendEnquiryReply,
  type EnquiryStatus,
} from "@/lib/enquiries/actions";

export type EnquiryReplyRow = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type EnquiryRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  message: string;
  status: EnquiryStatus;
  created_at: string;
  enquiry_replies: EnquiryReplyRow[] | null;
  listings: {
    member_id: string;
    headline: string | null;
    formatted_address: string | null;
    slug: string | null;
    suburb: string | null;
  } | null;
};

const STATUS_STYLES: Record<EnquiryStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  read: "bg-slate-100 text-slate-700",
  replied: "bg-green-100 text-green-800",
  archived: "bg-slate-200 text-slate-500",
};

const BTN = "rounded border px-3 py-1 text-sm hover:bg-slate-50 disabled:opacity-50";

export default function EnquiriesList({
  enquiries,
  role,
  userId,
}: {
  enquiries: EnquiryRow[];
  role: "seller" | "buyer";
  userId: string;
}) {
  if (enquiries.length === 0) {
    return <p className="text-sm text-slate-500">No enquiries yet.</p>;
  }

  return (
    <div className="space-y-3">
      {enquiries.map((e) => (
        <EnquiryCard key={e.id} enquiry={e} role={role} userId={userId} />
      ))}
    </div>
  );
}

function EnquiryCard({
  enquiry: e,
  role,
  userId,
}: {
  enquiry: EnquiryRow;
  role: "seller" | "buyer";
  userId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const replies = e.enquiry_replies ?? [];

  function label(senderId: string) {
    if (senderId === userId) return "You";
    return senderId === e.buyer_id ? "Buyer" : "Vendor";
  }

  function changeStatus(status: EnquiryStatus) {
    setErrorMsg(null);
    startTransition(async () => {
      const result = await updateEnquiryStatus(e.id, status);
      if (result?.error) setErrorMsg(result.error);
    });
  }

  function submitReply() {
    setErrorMsg(null);
    startTransition(async () => {
      const result = await sendEnquiryReply(e.id, reply);
      if (result?.error) setErrorMsg(result.error);
      else setReply("");
    });
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">
            {e.listings?.headline ?? e.listings?.formatted_address ?? "Listing"}
          </p>
          {e.listings?.suburb && (
            <p className="text-sm text-slate-500">{e.listings.suburb}</p>
          )}
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[e.status]}`}>
          {e.status}
        </span>
      </div>

      {/* Conversation */}
      <div className="mt-3 space-y-2">
        <Message
          who={label(e.buyer_id)}
          body={e.message}
          at={e.created_at}
          mine={e.buyer_id === userId}
        />
        {replies.map((r) => (
          <Message
            key={r.id}
            who={label(r.sender_id)}
            body={r.body}
            at={r.created_at}
            mine={r.sender_id === userId}
          />
        ))}
      </div>

      {/* Reply box */}
      <div className="mt-3">
        <textarea
          value={reply}
          onChange={(ev) => setReply(ev.target.value)}
          maxLength={5000}
          rows={3}
          placeholder="Write a reply…"
          className="w-full rounded border border-slate-300 p-2 text-sm"
          disabled={isPending}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            disabled={isPending || reply.trim().length === 0}
            onClick={submitReply}
            className="rounded bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isPending ? "Sending…" : "Send reply"}
          </button>

          {role === "seller" && e.status === "new" && (
            <button disabled={isPending} onClick={() => changeStatus("read")} className={BTN}>
              Mark as read
            </button>
          )}
          {role === "seller" && (e.status !== "archived" ? (
            <button disabled={isPending} onClick={() => changeStatus("archived")} className={BTN}>
              Archive
            </button>
          ) : (
            <button disabled={isPending} onClick={() => changeStatus("read")} className={BTN}>
              Unarchive
            </button>
          ))}
        </div>
        {errorMsg && <p className="mt-2 text-sm text-red-600">{errorMsg}</p>}
      </div>
    </div>
  );
}

function Message({
  who,
  body,
  at,
  mine,
}: {
  who: string;
  body: string;
  at: string;
  mine: boolean;
}) {
  return (
    <div className={`rounded-md p-3 text-sm ${mine ? "bg-emerald-50" : "bg-slate-50"}`}>
      <div className="mb-1 flex justify-between text-xs text-slate-500">
        <span className="font-medium">{who}</span>
        <span>{new Date(at).toLocaleString("en-NZ")}</span>
      </div>
      <p className="whitespace-pre-wrap">{body}</p>
    </div>
  );
}
