"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { sendMessage, markRead } from "@/lib/messages/actions";
import type { Thread } from "@/lib/viewings/request-schema";
import { formatNzDate, formatNzTime } from "@/lib/viewings/time";

export default function MessageThread({
  thread,
  viewerId,
  otherLabel,
  defaultOpen = false,
}: {
  thread: Thread;
  viewerId: string;
  otherLabel: string;
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen || thread.unread > 0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const marked = useRef(false);

  useEffect(() => {
    if (open && thread.unread > 0 && !marked.current) {
      marked.current = true;
      void markRead(thread.id).then(() => router.refresh());
    }
  }, [open, thread.unread, thread.id, router]);

  async function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    const res = await sendMessage(thread.id, text);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Couldn't send the message.");
      return;
    }
    setBody("");
    router.refresh();
  }

  const textCount = thread.messages.filter((m) => m.kind === "text").length;

  return (
    <div className="mt-4 rounded-lg border border-slate-200">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-slate-700"
      >
        <span>Messages{textCount > 0 ? ` (${textCount})` : ""}</span>
        {thread.unread > 0 ? (
          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs text-white">{thread.unread} new</span>
        ) : (
          <span className="text-xs text-slate-400">{open ? "Hide" : "Show"}</span>
        )}
      </button>

      {open ? (
        <div className="border-t border-slate-200 p-3">
          {thread.messages.length === 0 ? (
            <p className="text-xs text-slate-500">No messages yet.</p>
          ) : (
            <ul className="max-h-[28rem] space-y-2 overflow-y-auto">
              {thread.messages.map((m) =>
                m.kind === "system" ? (
                  <li key={m.id} className="text-center text-xs text-slate-400">
                    {m.body} &middot; {formatNzTime(m.created_at)}, {formatNzDate(m.created_at)}
                  </li>
                ) : (
                  <li
                    key={m.id}
                    className={
                      m.sender_id === viewerId
                        ? "ml-8 rounded-lg bg-emerald-50 px-3 py-2 text-sm"
                        : "mr-8 rounded-lg bg-slate-100 px-3 py-2 text-sm"
                    }
                  >
                    <p className="text-xs text-slate-500">
                      {m.sender_id === viewerId ? "You" : otherLabel} &middot; {formatNzTime(m.created_at)},{" "}
                      {formatNzDate(m.created_at)}
                    </p>
                    <p className="whitespace-pre-wrap text-slate-800">{m.body}</p>
                  </li>
                )
              )}
            </ul>
          )}

          <form onSubmit={handleSend} className="mt-3 space-y-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Write a message"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            {error ? <p className="text-xs text-rose-600">{error}</p> : null}
            <button
              type="submit"
              disabled={busy || !body.trim()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy ? "Sending..." : "Send"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}