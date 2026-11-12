import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { notifyNewMessage } from "@/lib/messages/notify";

// Enquiries post into the buyer's conversation for the listing, so questions,
// viewing requests and replies share one thread.

const ERRORS: Record<string, [string, number]> = {
  AUTH_REQUIRED: ["Please sign in to send a message.", 401],
  MESSAGE_EMPTY: ["Please write a message.", 400],
  MESSAGE_TOO_LONG: ["Messages can be up to 2,000 characters.", 400],
  LISTING_NOT_FOUND: ["That listing no longer exists.", 404],
  LISTING_NOT_AVAILABLE: ["This listing isn't currently available.", 400],
  OWN_LISTING: ["You can't send an enquiry about your own listing.", 400],
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const listingId = typeof body?.listingId === "string" ? body.listingId : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!listingId || !message) {
    return NextResponse.json({ error: "Listing and message are required" }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: ERRORS.MESSAGE_TOO_LONG[0] }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {}
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: ERRORS.AUTH_REQUIRED[0] }, { status: 401 });

  const { data, error } = await supabase.rpc("start_listing_enquiry", {
    p_listing_id: listingId,
    p_body: message,
  });

  if (error) {
    const known = ERRORS[error.message];
    if (known) return NextResponse.json({ error: known[0] }, { status: known[1] });
    console.error("[enquiries] send failed:", error);
    return NextResponse.json({ error: "Couldn't send your message. Please try again." }, { status: 500 });
  }

  const conversationId = data as string;
  await notifyNewMessage(conversationId, user.id, message);

  return NextResponse.json({ ok: true, conversationId });
}