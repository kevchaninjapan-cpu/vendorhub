import Link from "next/link";
import { listMyConversations } from "@/lib/messages/queries";
import { formatNzDate, formatNzTime } from "@/lib/viewings/time";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const items = await listMyConversations();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/account" className="text-sm text-slate-500 hover:text-slate-800">
        &larr; Back to my account
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Messages</h1>
      <p className="mt-1 text-sm text-slate-500">
        Questions, viewing requests and replies with buyers and sellers.
      </p>

      {items.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">
          No messages yet. Questions you send from a listing, or that buyers send about yours, will appear here.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {items.map((i) => (
            <li key={i.id}>
              <Link href={`/account/messages/${i.id}`} className="flex gap-3 p-4 hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className={i.unread > 0 ? "truncate font-semibold text-slate-900" : "truncate font-medium text-slate-800"}>
                      {i.listing_title}
                    </p>
                    <span className="shrink-0 text-xs text-slate-400">
                      {formatNzTime(i.last_message_at)}, {formatNzDate(i.last_message_at)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {i.role === "seller" ? `Buyer: ${i.other_name}` : "You enquired as a buyer"}
                  </p>
                  {i.last_body ? (
                    <p className={i.last_kind === "system" ? "mt-1 truncate text-sm italic text-slate-400" : "mt-1 truncate text-sm text-slate-600"}>
                      {i.last_body}
                    </p>
                  ) : null}
                </div>
                {i.unread > 0 ? (
                  <span className="self-center rounded-full bg-emerald-600 px-2 py-0.5 text-xs text-white">
                    {i.unread}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}