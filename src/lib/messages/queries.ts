// Server-side reads for the inbox. Never imported by client components.
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Thread, ThreadMessage } from "@/lib/viewings/request-schema";

export type InboxItem = {
  id: string;
  listing_id: string;
  role: "buyer" | "seller";
  other_name: string;
  listing_title: string;
  listing_status: string;
  listing_slug: string | null;
  listing_region: string | null;
  listing_suburb: string | null;
  last_body: string | null;
  last_kind: "text" | "system" | null;
  last_message_at: string;
  unread: number;
};

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}

const toSlug = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "-");

export function listingPath(item: InboxItem): string | null {
  if (!item.listing_slug || !item.listing_region || !item.listing_suburb) return null;
  if (item.listing_status !== "live" && item.listing_status !== "under_offer") return null;
  return `/listings/${toSlug(item.listing_region)}/${toSlug(item.listing_suburb)}/${item.listing_slug}`;
}

export async function listMyConversations(): Promise<InboxItem[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("list_my_conversations");
  if (error) {
    console.error("[messages] list failed:", error);
    return [];
  }
  return ((data ?? []) as InboxItem[]).map((r) => ({ ...r, unread: Number(r.unread ?? 0) }));
}

export async function getUnreadMessageCount(): Promise<number> {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase.rpc("get_unread_message_count");
    if (error) return 0;
    return Number(data ?? 0);
  } catch {
    return 0;
  }
}

export async function getConversationView(
  conversationId: string
): Promise<{ item: InboxItem; viewerId: string; thread: Thread } | null> {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const items = await listMyConversations();
  const item = items.find((i) => i.id === conversationId);
  if (!item) return null;

  const { data } = await supabase
    .from("listing_messages")
    .select("id, sender_id, kind, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at")
    .limit(1000);

  return {
    item,
    viewerId: user.id,
    thread: { id: conversationId, messages: (data ?? []) as ThreadMessage[], unread: item.unread },
  };
}