// "New message" emails, throttled to one per person per conversation every
// 15 minutes (sooner if they've read the thread since the last email).
// Server only. Uses its own service-role client because the new tables
// aren't in the generated Supabase types.
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/client";
import ViewingRequestUpdate from "@/lib/email/templates/viewing-request-update";

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "https://vendorhub.co.nz").replace(/\/$/, "");

export async function notifyNewMessage(conversationId: string, senderId: string, body: string): Promise<void> {
  try {
    const db = admin();

    const { data: convRow } = await db
      .from("listing_conversations")
      .select("listing_id, buyer_id, seller_id")
      .eq("id", conversationId)
      .maybeSingle();
    const c = convRow as { listing_id: string; buyer_id: string; seller_id: string } | null;
    if (!c) return;

    const toBuyer = senderId === c.seller_id;
    const recipientId = toBuyer ? c.buyer_id : c.seller_id;
    if (!recipientId || recipientId === senderId) return;

    const { data: claimed } = await db.rpc("claim_message_notification", {
      p_conversation_id: conversationId,
      p_to_buyer: toBuyer,
    });
    if (!claimed) return;

    const { data: listingRow } = await db
      .from("listings")
      .select("headline, formatted_address")
      .eq("id", c.listing_id)
      .maybeSingle();
    const l = listingRow as { headline: string | null; formatted_address: string | null } | null;
    const title = l?.headline ?? l?.formatted_address ?? "a listing";

    const { data: profileRow } = await db.from("profiles").select("email").eq("id", recipientId).maybeSingle();
    let to = (profileRow as { email: string | null } | null)?.email ?? null;
    if (!to) {
      const { data: u } = await db.auth.admin.getUserById(recipientId);
      to = u?.user?.email ?? null;
    }
    if (!to) return;

    const preview = body.length > 300 ? body.slice(0, 300) + "..." : body;

    await sendEmail({
      to,
      subject: `New message about ${title}`,
      react: ViewingRequestUpdate({
        heading: "You have a new message",
        lines: [
          toBuyer ? "The seller sent you a message:" : "A buyer sent you a message:",
          preview,
          "Further messages in this conversation won't be emailed for 15 minutes unless you've read it.",
        ],
        buttonLabel: "View and reply",
        url: `${siteUrl()}/account/messages/${conversationId}`,
      }),
    });
  } catch (e) {
    console.error("[messages] notification failed:", e);
  }
}