import Link from "next/link";
import { notFound } from "next/navigation";
import { getConversationView, listingPath } from "@/lib/messages/queries";
import MessageThread from "@/components/listings/viewings/MessageThread";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ConversationPage({ params }: Props) {
  const { id } = await params;
  const view = await getConversationView(id);
  if (!view) notFound();

  const { item, viewerId, thread } = view;
  const path = listingPath(item);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/account/messages" className="text-sm text-slate-500 hover:text-slate-800">
        &larr; All messages
      </Link>

      <h1 className="mt-3 text-xl font-semibold">{item.listing_title}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {item.role === "seller" ? `Conversation with ${item.other_name}` : "Conversation with the seller"}
      </p>

      <div className="mt-2 flex flex-wrap gap-4 text-sm">
        {path ? (
          <Link href={path} className="text-emerald-700 underline">
            View listing
          </Link>
        ) : null}
        {item.role === "seller" ? (
          <Link href={`/account/listings/${item.listing_id}/viewings`} className="text-emerald-700 underline">
            Viewings and requests
          </Link>
        ) : null}
      </div>

      <MessageThread
        thread={thread}
        viewerId={viewerId}
        otherLabel={item.role === "seller" ? item.other_name : "Seller"}
        defaultOpen
      />
    </div>
  );
}