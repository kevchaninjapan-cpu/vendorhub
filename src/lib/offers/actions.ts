"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { ZodError } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email/client";
import OfferReceived from "@/lib/email/templates/offer-received";
import OfferAccepted from "@/lib/email/templates/offer-accepted";
import OfferDeclined from "@/lib/email/templates/offer-declined";
import OfferCountered from "@/lib/email/templates/offer-countered";
import type { ActionResult } from "@/lib/documents/schema";
import { offerFormSchema, type OfferForm } from "./schema";

// Every action RETURNS its result rather than throwing. Next.js hides the
// message of errors thrown from server actions in production, so a thrown
// "Your offer must be at least NZ$..." would reach the buyer as a generic
// failure. Screens import from ./client, which unwraps these results.

// ---- Supabase (cookie-scoped, respects RLS) --------------------------------

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

// No redirect() here: a redirect thrown inside run() would be swallowed.
async function requireUser() {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("AUTH_REQUIRED");
  return { supabase, user };
}

// ---- Error messages --------------------------------------------------------

function humaniseError(msg: string): string {
  if (msg.startsWith("OFFER_BELOW_MIN_PRICE:")) {
    const min = Number(msg.split(":")[1]);
    return `Your offer must be at least NZ$${min.toLocaleString("en-NZ")} (75% of the asking price).`;
  }
  const map: Record<string, string> = {
    AUTH_REQUIRED: "Please sign in first.",
    VERIFICATION_REQUIRED: "Please complete identity verification before making offers.",
    LISTING_NOT_FOUND: "That listing no longer exists.",
    LISTING_NOT_ACCEPTING_OFFERS: "This listing isn't accepting offers.",
    CANNOT_OFFER_ON_OWN_LISTING: "You can't offer on your own listing.",
    OFFER_NOT_FOUND: "This offer no longer exists.",
    OFFER_NOT_ACTIVE: "This offer is no longer active.",
    NOT_SELLER: "Only the seller can accept.",
    NOT_PARTICIPANT: "You aren't part of this offer.",
  };
  return map[msg] ?? msg;
}

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    console.error("[offers]", e);
    if (e instanceof ZodError) return { ok: false, error: "Some offer details are missing or invalid." };
    const msg = e instanceof Error ? e.message : "Something went wrong. Please try again.";
    return { ok: false, error: humaniseError(msg) };
  }
}

// ---- Recipient lookup ------------------------------------------------------
// Service-role client: RLS on profiles limits each user to their own row, so
// neither party can read the other's email with the cookie-scoped client.
// There is no FK between listings and profiles, so separate queries are used.

type Party = { email: string | null; name: string | null };

async function getProfile(userId: string): Promise<Party> {
  const { data } = await supabaseAdmin()
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .maybeSingle<{ email: string | null; full_name: string | null }>();
  return { email: data?.email ?? null, name: data?.full_name ?? null };
}

async function getListingSummary(listingId: string) {
  const { data } = await supabaseAdmin()
    .from("listings")
    .select("member_id, headline, formatted_address")
    .eq("id", listingId)
    .maybeSingle<{ member_id: string; headline: string | null; formatted_address: string | null }>();
  if (!data) return null;
  return {
    sellerId: data.member_id,
    title: data.headline ?? data.formatted_address ?? "the listing",
  };
}

async function getOfferSummary(offerId: string) {
  const { data } = await supabaseAdmin()
    .from("offers")
    .select("listing_id, buyer_id, amount")
    .eq("id", offerId)
    .maybeSingle<{ listing_id: string; buyer_id: string; amount: number }>();
  return data ?? null;
}

// Never let an email failure undo a completed offer transaction.
async function safeSend(fn: () => Promise<unknown>, label: string) {
  try {
    await fn();
  } catch (e) {
    console.error(`[offers] ${label} email failed:`, e);
  }
}

// ---- Submit ----------------------------------------------------------------

export async function submitOffer(
  listingId: string,
  input: OfferForm
): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const validated = offerFormSchema.parse(input);
    const { supabase, user } = await requireUser();

    const conditions: string[] = [];
    if (validated.finance_condition) conditions.push("finance");
    if (validated.building_report_condition) conditions.push("building_report");
    if (validated.lim_condition) conditions.push("lim");

    const { data, error } = await supabase.rpc("submit_offer", {
      p_listing_id: listingId,
      p_amount: validated.amount,
      p_conditions: conditions,
      p_expires_at: validated.expires_at || null,
      p_settlement_date: validated.settlement_date || null,
      p_notes: validated.notes ?? null,
    });

    if (error) throw new Error(error.message);

    await safeSend(async () => {
      const listing = await getListingSummary(listingId);
      if (!listing) return;
      const seller = await getProfile(listing.sellerId);
      if (!seller.email) return;
      const buyer = await getProfile(user.id);
      await sendEmail({
        to: seller.email,
        subject: `New offer on ${listing.title}`,
        react: OfferReceived({
          amount: validated.amount,
          listingTitle: listing.title,
          buyerName: buyer.name ?? "A verified buyer",
        }),
      });
    }, "offer.received");

    revalidatePath("/account/offers");
    return { id: data as string };
  });
}

// ---- Counter ---------------------------------------------------------------

export async function counterOffer(
  offerId: string,
  amount: number,
  notes?: string
): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const { supabase, user } = await requireUser();

    // Read before the RPC - status changes once it runs.
    const original = await getOfferSummary(offerId);

    const { data, error } = await supabase.rpc("counter_offer", {
      p_offer_id: offerId,
      p_amount: amount,
      p_notes: notes ?? null,
    });

    if (error) throw new Error(error.message);

    await safeSend(async () => {
      if (!original) return;
      const listing = await getListingSummary(original.listing_id);
      if (!listing) return;

      // Whoever did not send the counter receives the email.
      const senderIsBuyer = user.id === original.buyer_id;
      const recipientId = senderIsBuyer ? listing.sellerId : original.buyer_id;
      const recipient = await getProfile(recipientId);
      if (!recipient.email) return;

      await sendEmail({
        to: recipient.email,
        subject: `Counter-offer on ${listing.title}`,
        react: OfferCountered({
          originalAmount: original.amount,
          counterAmount: amount,
          listingTitle: listing.title,
          fromParty: senderIsBuyer ? "buyer" : "seller",
        }),
      });
    }, "offer.countered");

    revalidatePath("/account/offers");
    return { id: data as string };
  });
}

// ---- Accept ----------------------------------------------------------------

export async function acceptOffer(offerId: string): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const { supabase } = await requireUser();
    const offer = await getOfferSummary(offerId);

    const { error } = await supabase.rpc("accept_offer", { p_offer_id: offerId });
    if (error) throw new Error(error.message);

    await safeSend(async () => {
      if (!offer) return;
      const listing = await getListingSummary(offer.listing_id);
      if (!listing) return;
      const buyer = await getProfile(offer.buyer_id);
      if (!buyer.email) return;
      await sendEmail({
        to: buyer.email,
        subject: "Your offer was accepted",
        react: OfferAccepted({ amount: offer.amount, listingTitle: listing.title }),
      });
    }, "offer.accepted");

    revalidatePath("/account/offers");
    return { id: offerId };
  });
}

// ---- Decline / withdraw ----------------------------------------------------

export async function declineOffer(
  offerId: string,
  reason?: string
): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const { supabase, user } = await requireUser();
    const offer = await getOfferSummary(offerId);

    const { error } = await supabase.rpc("decline_offer", {
      p_offer_id: offerId,
      p_reason: reason ?? null,
    });
    if (error) throw new Error(error.message);

    await safeSend(async () => {
      if (!offer) return;
      // This action also backs the buyer's Withdraw button - don't email a
      // buyer about their own withdrawal.
      if (user.id === offer.buyer_id) return;
      const listing = await getListingSummary(offer.listing_id);
      if (!listing) return;
      const buyer = await getProfile(offer.buyer_id);
      if (!buyer.email) return;
      await sendEmail({
        to: buyer.email,
        subject: `Update on your offer - ${listing.title}`,
        react: OfferDeclined({
          amount: offer.amount,
          listingTitle: listing.title,
          reason: reason?.trim() || undefined,
        }),
      });
    }, "offer.declined");

    revalidatePath("/account/offers");
    return { id: offerId };
  });
}