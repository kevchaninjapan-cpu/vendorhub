"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { ZodError } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email/client";
import ViewingRequestUpdate from "@/lib/email/templates/viewing-request-update";
import type { ActionResult } from "@/lib/documents/schema";
import {
  viewingRequestInputSchema,
  describeAvailability,
  daysBetween,
  MAX_REQUEST_DAYS,
  type ViewingRequestInput,
  type ViewingRequest,
  type OwnerRequest,
  type BuyerRequestState,
  type Thread,
  type ThreadMessage,
} from "./request-schema";
import { nzWallTimeToDate, formatNzRange } from "./time";

// Actions RETURN { ok, error } instead of throwing, so the message reaches
// the user in production (Next.js hides messages thrown from server actions).

const ERRORS: Record<string, string> = {
  AUTH_REQUIRED: "Please sign in first.",
  NAME_REQUIRED: "Please enter your name.",
  PHONE_REQUIRED: "Please enter a phone number the seller can reach you on.",
  LISTING_NOT_FOUND: "That listing no longer exists.",
  LISTING_NOT_AVAILABLE: "This listing isn't currently available.",
  OWN_LISTING: "You can't request a viewing of your own listing.",
  REQUESTS_OFF: "The seller isn't taking viewing requests right now.",
  DATES_INVALID: "Please check the dates. The range can't start in the past.",
  RANGE_TOO_LONG: `Please choose a range of up to ${MAX_REQUEST_DAYS} days.`,
  DAYS_REQUIRED: "Choose at least one day.",
  TIMES_INVALID: "The latest time must be after the earliest time.",
  NO_MATCHING_DAYS: "None of the chosen days fall within those dates.",
  ALREADY_REQUESTED:
    "You already have a request open for this property. Withdraw it if you'd like to send a new one.",
  REQUEST_NOT_FOUND: "That request no longer exists.",
  REQUEST_CLOSED: "This request has already been closed.",
  LENGTH_INVALID: "Viewings can be 15 minutes to 2 hours long.",
  TIME_PAST: "That time has already passed.",
  NOT_BUYER: "Only the buyer can do that.",
  NO_PROPOSAL: "There's no suggested time to accept.",
  CONVERSATION_NOT_FOUND: "That conversation no longer exists.",
  MESSAGE_EMPTY: "Please write a message.",
  MESSAGE_TOO_LONG: "Messages can be up to 2,000 characters.",
  NOT_PARTICIPANT: "You aren't part of this conversation.",
  NOT_LISTING_OWNER: "You can only manage your own listings.",
};

const REQUEST_COLS =
  "id, listing_id, buyer_id, buyer_name, buyer_phone, date_from, date_to, days, time_from, time_to, note, status, proposed_starts_at, proposed_ends_at, viewing_id, decline_reason, created_at";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            /* ignore in RSC */
          }
        },
      },
    }
  );
}

type SupabaseServer = Awaited<ReturnType<typeof getSupabase>>;

async function requireUser() {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("AUTH_REQUIRED");
  return { supabase, user };
}

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    console.error("[viewing-requests]", e);
    if (e instanceof ZodError) {
      return { ok: false, error: e.issues[0]?.message ?? "Some details are missing or invalid." };
    }
    const msg = e instanceof Error ? e.message : "Something went wrong. Please try again.";
    return { ok: false, error: ERRORS[msg] ?? msg };
  }
}

const toSlug = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "-");
const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "https://vendorhub.co.nz").replace(/\/$/, "");
const managePath = (listingId: string) => `/account/listings/${listingId}/viewings`;

async function getListingInfo(listingId: string) {
  const { data } = await supabaseAdmin()
    .from("listings")
    .select("member_id, headline, formatted_address, slug, region, suburb")
    .eq("id", listingId)
    .maybeSingle<{
      member_id: string;
      headline: string | null;
      formatted_address: string | null;
      slug: string | null;
      region: string | null;
      suburb: string | null;
    }>();
  if (!data) return null;
  const path =
    data.slug && data.region && data.suburb
      ? `/listings/${toSlug(data.region)}/${toSlug(data.suburb)}/${data.slug}`
      : "/buy";
  return {
    sellerId: data.member_id,
    title: data.headline ?? data.formatted_address ?? "the property",
    url: siteUrl() + path,
  };
}

// Service-role lookup: neither party can read the other's profile under RLS.
async function getEmail(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin()
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle<{ email: string | null }>();
  return data?.email ?? null;
}

// Never let an email failure undo a request or message.
async function notify(
  userId: string,
  subject: string,
  heading: string,
  lines: string[],
  buttonLabel: string,
  url: string
) {
  try {
    const to = await getEmail(userId);
    if (!to) return;
    await sendEmail({
      to,
      subject,
      react: ViewingRequestUpdate({ heading, lines: lines.filter(Boolean), buttonLabel, url }),
    });
  } catch (e) {
    console.error("[viewing-requests] email failed:", e);
  }
}

async function loadRequest(supabase: SupabaseServer, id: string): Promise<ViewingRequest | null> {
  const { data } = await supabase.from("viewing_requests").select(REQUEST_COLS).eq("id", id).maybeSingle();
  return (data ?? null) as ViewingRequest | null;
}

function rangeOf(r: ViewingRequest): string {
  if (!r.proposed_starts_at || !r.proposed_ends_at) return "";
  return formatNzRange(r.proposed_starts_at, r.proposed_ends_at);
}

type ConversationRow = {
  id: string;
  buyer_id: string;
  seller_id: string;
  buyer_last_read_at: string | null;
  seller_last_read_at: string | null;
};

async function loadConversations(supabase: SupabaseServer, listingId: string, buyerId?: string) {
  let query = supabase
    .from("listing_conversations")
    .select("id, buyer_id, seller_id, buyer_last_read_at, seller_last_read_at")
    .eq("listing_id", listingId);
  if (buyerId) query = query.eq("buyer_id", buyerId);
  const { data: convData } = await query;
  const convs = (convData ?? []) as ConversationRow[];

  const byConv = new Map<string, ThreadMessage[]>();
  if (convs.length > 0) {
    const { data: msgData } = await supabase
      .from("listing_messages")
      .select("id, conversation_id, sender_id, kind, body, created_at")
      .in(
        "conversation_id",
        convs.map((c) => c.id)
      )
      .order("created_at")
      .limit(2000);
    for (const m of (msgData ?? []) as (ThreadMessage & { conversation_id: string })[]) {
      const list = byConv.get(m.conversation_id) ?? [];
      list.push({ id: m.id, sender_id: m.sender_id, kind: m.kind, body: m.body, created_at: m.created_at });
      byConv.set(m.conversation_id, list);
    }
  }
  return convs.map((c) => ({ conv: c, messages: byConv.get(c.id) ?? [] }));
}

function toThread(conv: ConversationRow, messages: ThreadMessage[], viewerId: string): Thread {
  const lastRead = viewerId === conv.buyer_id ? conv.buyer_last_read_at : conv.seller_last_read_at;
  const unread = messages.filter(
    (m) =>
      m.kind === "text" &&
      m.sender_id &&
      m.sender_id !== viewerId &&
      (!lastRead || new Date(m.created_at).getTime() > new Date(lastRead).getTime())
  ).length;
  return { id: conv.id, messages, unread };
}

// ---- Seller: switch requests on or off -------------------------------------
export async function setAcceptsViewingRequests(
  listingId: string,
  enabled: boolean
): Promise<ActionResult<{ enabled: boolean }>> {
  return run(async () => {
    const { supabase, user } = await requireUser();
    const { data, error } = await supabase
      .from("listings")
      .update({ accepts_viewing_requests: enabled })
      .eq("id", listingId)
      .eq("member_id", user.id)
      .select("id");
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error("NOT_LISTING_OWNER");
    revalidatePath(managePath(listingId));
    return { enabled };
  });
}

// ---- Buyer: send a request -------------------------------------------------
export async function createViewingRequest(input: ViewingRequestInput): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const v = viewingRequestInputSchema.parse(input);
    if (v.date_to < v.date_from) throw new Error("DATES_INVALID");
    if (daysBetween(v.date_from, v.date_to) > MAX_REQUEST_DAYS) throw new Error("RANGE_TOO_LONG");
    if (v.time_to <= v.time_from) throw new Error("TIMES_INVALID");

    const { supabase } = await requireUser();
    const note = v.note?.trim() || null;

    const { data, error } = await supabase.rpc("create_viewing_request", {
      p_listing_id: v.listing_id,
      p_date_from: v.date_from,
      p_date_to: v.date_to,
      p_days: v.days,
      p_time_from: v.time_from,
      p_time_to: v.time_to,
      p_note: note,
      p_name: v.name,
      p_phone: v.phone,
    });
    if (error) throw new Error(error.message);

    const listing = await getListingInfo(v.listing_id);
    if (listing) {
      await notify(
        listing.sellerId,
        `Viewing request - ${listing.title}`,
        "New private viewing request",
        [
          `${v.name} would like a private viewing of ${listing.title}.`,
          `Available: ${describeAvailability(v)}`,
          note ? `Note: ${note}` : "",
          `Phone: ${v.phone}`,
        ],
        "Reply to the request",
        siteUrl() + managePath(v.listing_id)
      );
    }

    revalidatePath(managePath(v.listing_id));
    return { id: data as string };
  });
}

// ---- Seller: confirm (inside window) or suggest (outside window) -----------
export async function confirmViewingRequest(
  requestId: string,
  date: string,
  time: string,
  minutes: number
): Promise<ActionResult<{ status: string }>> {
  return run(async () => {
    const { supabase } = await requireUser();
    const starts = nzWallTimeToDate(date, time);
    if (!starts) throw new Error("Please check the date and time.");

    const { data, error } = await supabase.rpc("confirm_viewing_request", {
      p_request_id: requestId,
      p_starts_at: starts.toISOString(),
      p_minutes: minutes,
    });
    if (error) throw new Error(error.message);
    const status = String(data);

    const r = await loadRequest(supabase, requestId);
    if (r) {
      const listing = await getListingInfo(r.listing_id);
      if (listing) {
        if (status === "confirmed") {
          await notify(
            r.buyer_id,
            `Viewing confirmed - ${listing.title}`,
            "Your private viewing is confirmed",
            [
              listing.title,
              `When: ${rangeOf(r)}`,
              "The seller has your name and phone number. If you can't make it, please cancel from the listing page.",
            ],
            "View listing",
            listing.url
          );
        } else {
          await notify(
            r.buyer_id,
            `Suggested viewing time - ${listing.title}`,
            "The seller has suggested a time",
            [
              listing.title,
              `Suggested: ${rangeOf(r)}`,
              "Accept it on the listing page to book the viewing, or reply in the messages.",
            ],
            "View and respond",
            listing.url
          );
        }
      }
      revalidatePath(managePath(r.listing_id));
    }

    return { status };
  });
}

// ---- Buyer: accept the seller's suggested time -----------------------------
export async function acceptViewingProposal(requestId: string): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const { supabase } = await requireUser();
    const { data, error } = await supabase.rpc("accept_viewing_proposal", { p_request_id: requestId });
    if (error) throw new Error(error.message);

    const r = await loadRequest(supabase, requestId);
    if (r) {
      const listing = await getListingInfo(r.listing_id);
      if (listing) {
        await notify(
          listing.sellerId,
          `Viewing confirmed - ${listing.title}`,
          "The buyer accepted your suggested time",
          [`${r.buyer_name} accepted ${rangeOf(r)}.`, `Phone: ${r.buyer_phone}`],
          "See bookings",
          siteUrl() + managePath(r.listing_id)
        );
      }
      revalidatePath(managePath(r.listing_id));
    }
    return { id: data as string };
  });
}

// ---- Seller: decline -------------------------------------------------------
export async function declineViewingRequest(
  requestId: string,
  reason?: string
): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const { supabase } = await requireUser();
    const { error } = await supabase.rpc("decline_viewing_request", {
      p_request_id: requestId,
      p_reason: reason?.trim() || null,
    });
    if (error) throw new Error(error.message);

    const r = await loadRequest(supabase, requestId);
    if (r) {
      const listing = await getListingInfo(r.listing_id);
      if (listing) {
        await notify(
          r.buyer_id,
          `Viewing request - ${listing.title}`,
          "Your viewing request was declined",
          [
            listing.title,
            r.decline_reason ? `Message from the seller: ${r.decline_reason}` : "",
            "You can send a new request from the listing page.",
          ],
          "View listing",
          listing.url
        );
      }
      revalidatePath(managePath(r.listing_id));
    }
    return { id: requestId };
  });
}

// ---- Buyer: withdraw -------------------------------------------------------
export async function withdrawViewingRequest(requestId: string): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const { supabase } = await requireUser();
    const { error } = await supabase.rpc("withdraw_viewing_request", { p_request_id: requestId });
    if (error) throw new Error(error.message);

    const r = await loadRequest(supabase, requestId);
    if (r) {
      const listing = await getListingInfo(r.listing_id);
      if (listing) {
        await notify(
          listing.sellerId,
          `Viewing request withdrawn - ${listing.title}`,
          "A buyer withdrew their viewing request",
          [`${r.buyer_name} withdrew their request for ${listing.title}.`],
          "See requests",
          siteUrl() + managePath(r.listing_id)
        );
      }
      revalidatePath(managePath(r.listing_id));
    }
    return { id: requestId };
  });
}

// ---- Messages --------------------------------------------------------------
export async function sendListingMessage(conversationId: string, body: string): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const text = (body ?? "").trim();
    if (!text) throw new Error("MESSAGE_EMPTY");
    if (text.length > 2000) throw new Error("MESSAGE_TOO_LONG");

    const { supabase, user } = await requireUser();
    const { data, error } = await supabase.rpc("send_listing_message", {
      p_conversation_id: conversationId,
      p_body: text,
    });
    if (error) throw new Error(error.message);

    const { data: convRow } = await supabase
      .from("listing_conversations")
      .select("listing_id, buyer_id, seller_id")
      .eq("id", conversationId)
      .maybeSingle();
    const c = convRow as { listing_id: string; buyer_id: string; seller_id: string } | null;

    if (c) {
      const listing = await getListingInfo(c.listing_id);
      const toBuyer = user.id === c.seller_id;
      if (listing) {
        const preview = text.length > 300 ? text.slice(0, 300) + "..." : text;
        await notify(
          toBuyer ? c.buyer_id : c.seller_id,
          `New message about ${listing.title}`,
          "You have a new message",
          [toBuyer ? "The seller replied:" : "A buyer sent you a message:", preview],
          "View and reply",
          toBuyer ? listing.url : siteUrl() + managePath(c.listing_id)
        );
      }
      revalidatePath(managePath(c.listing_id));
    }

    return { id: data as string };
  });
}

export async function markConversationRead(conversationId: string): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const { supabase } = await requireUser();
    const { error } = await supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });
    if (error) throw new Error(error.message);
    return { id: conversationId };
  });
}

// ---- Reads -----------------------------------------------------------------

// Buyer view on the listing page: their latest request and their thread.
export async function getBuyerRequestState(listingId: string): Promise<BuyerRequestState> {
  const supabase = await getSupabase();

  const { data: listingRow } = await supabase
    .from("listings")
    .select("accepts_viewing_requests")
    .eq("id", listingId)
    .maybeSingle();
  const accepts =
    (listingRow as { accepts_viewing_requests?: boolean | null } | null)?.accepts_viewing_requests !== false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { accepts, viewerId: null, request: null, thread: null };

  await supabase.rpc("expire_viewing_requests", { p_listing_id: listingId });

  const { data: reqRow } = await supabase
    .from("viewing_requests")
    .select(REQUEST_COLS)
    .eq("listing_id", listingId)
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const convs = await loadConversations(supabase, listingId, user.id);
  const first = convs[0];

  return {
    accepts,
    viewerId: user.id,
    request: (reqRow ?? null) as ViewingRequest | null,
    thread: first ? toThread(first.conv, first.messages, user.id) : null,
  };
}

// Seller view: recent requests, each buyer's thread attached to their latest.
export async function listRequestsForOwner(listingId: string): Promise<OwnerRequest[]> {
  const { supabase, user } = await requireUser();

  await supabase.rpc("expire_viewing_requests", { p_listing_id: listingId });

  const { data } = await supabase
    .from("viewing_requests")
    .select(REQUEST_COLS)
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false })
    .limit(50);
  const requests = (data ?? []) as ViewingRequest[];
  if (requests.length === 0) return [];

  const convs = await loadConversations(supabase, listingId);
  const byBuyer = new Map<string, { conv: ConversationRow; messages: ThreadMessage[] }>();
  for (const c of convs) byBuyer.set(c.conv.buyer_id, c);

  const seen = new Set<string>();
  return requests.map((r) => {
    const c = byBuyer.get(r.buyer_id);
    let thread: Thread | null = null;
    if (c && !seen.has(r.buyer_id)) {
      seen.add(r.buyer_id);
      thread = toThread(c.conv, c.messages, user.id);
    }
    return { ...r, thread };
  });
}