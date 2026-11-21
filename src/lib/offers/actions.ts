"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { ZodError } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/client";
import OfferReceived from "@/lib/email/templates/offer-received";
import OfferAccepted from "@/lib/email/templates/offer-accepted";
import OfferDeclined from "@/lib/email/templates/offer-declined";
import OfferCountered from "@/lib/email/templates/offer-countered";
import type { ActionResult } from "@/lib/documents/schema";
import { emailUser, listingInfo, notifyAutoDeclined } from "@/lib/email/notify";
import { offerFormSchema, type OfferForm } from "./schema";

// Every action RETURNS { ok, error } instead of throwing, so the message
// reaches the user in production. Screens import from ./client, which
// unwraps these results. Turn rules are enforced in the database.

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

async function requireUser() {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("AUTH_REQUIRED");
  return { supabase, user };
}

function humaniseError(msg: string): string {
  if (msg.includes("OFFER_BELOW_MIN_PRICE:")) {
    const min = Number(msg.split("OFFER_BELOW_MIN_PRICE:")[1]);
    return `Offers must be at least NZ$${min.toLocaleString("en-NZ")} (75% of the asking price).`;
  }
  const map: Record<string, string> = {
    AUTH_REQUIRED: "Please sign in first.",
    VERIFICATION_REQUIRED: "Please complete identity verification before making offers.",
    LISTING_NOT_FOUND: "That listing no longer exists.",
    LISTING_NOT_ACCEPTING_OFFERS: "This listing isn't accepting offers.",
    CANNOT_OFFER_ON_OWN_LISTING: "You can't offer on your own listing.",
    OFFER_NOT_FOUND: "This offer no longer exists.",
    OFFER_NOT_ACTIVE: "This offer has already been replaced or closed. Refresh to see the latest.",
    OFFER_EXPIRED: "This offer has expired.",
    NOT_YOUR_TURN: "You're waiting on the other party to respond to this offer.",
    NOT_PARTICIPANT: "You aren't part of this offer.",
    AMOUNT_INVALID: "Please enter a valid amount.",
  };
  for (const key of Object.keys(map)) if (msg.includes(key)) return map[key];
  return msg;
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

type OfferSummary = { listing_id: string; buyer_id: string; amount: number; proposed_by: "buyer" | "seller" };

async function getOffer(offerId: string): Promise<OfferSummary | null> {
  const { data } = await supabaseAdmin
    .from("offers")
    .select("listing_id, buyer_id, amount, proposed_by")
    .eq("id", offerId)
    .maybeSingle();
  return (data ?? null) as OfferSummary | null;
}

async function getProfile(userId: string) {
  const { data } = await supabaseAdmin.from("profiles").select("email, full_name").eq("id", userId).maybeSingle();
  return (data ?? null) as { email: string | null; full_name: string | null } | null;
}

async function safeSend(fn: () => Promise<unknown>, label: string) {
  try {
    await fn();
  } catch (e) {
    console.error(`[offers] ${label} email failed:`, e);
  }
}

const money = (n: number) => "NZ$" + Number(n).toLocaleString("en-NZ");

// ---- Submit ------------------------------------------------------------------
export async function submitOffer(listingId: string, input: OfferForm): Promise<ActionResult<{ id: string }>> {
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
      const info = await listingInfo(listingId);
      if (!info) return;
      const seller = await getProfile(info.sellerId);
      if (!seller?.email) return;
      const buyer = await getProfile(user.id);
      await sendEmail({
        to: seller.email,
        subject: `New offer on ${info.title}`,
        react: OfferReceived({
          amount: validated.amount,
          listingTitle: info.title,
          buyerName: buyer?.full_name ?? "A verified buyer",
        }),
      });
    }, "offer.received");

    revalidatePath("/account/offers");
    return { id: data as string };
  });
}

// ---- Counter -----------------------------------------------------------------
export async function counterOffer(
  offerId: string,
  amount: number,
  notes?: string
): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const { supabase, user } = await requireUser();
    const original = await getOffer(offerId);

    const { data, error } = await supabase.rpc("counter_offer", {
      p_offer_id: offerId,
      p_amount: amount,
      p_notes: notes ?? null,
    });
    if (error) throw new Error(error.message);

    if (original) {
      await safeSend(async () => {
        const info = await listingInfo(original.listing_id);
        if (!info) return;
        const senderIsBuyer = user.id === original.buyer_id;
        const recipient = await getProfile(senderIsBuyer ? info.sellerId : original.buyer_id);
        if (!recipient?.email) return;
        await sendEmail({
          to: recipient.email,
          subject: `Counter-offer on ${info.title}`,
          react: OfferCountered({
            originalAmount: original.amount,
            counterAmount: amount,
            listingTitle: info.title,
            fromParty: senderIsBuyer ? "buyer" : "seller",
          }),
        });
      }, "offer.countered");
    }

    revalidatePath("/account/offers");
    return { id: data as string };
  });
}

// ---- Accept ------------------------------------------------------------------
export async function acceptOffer(offerId: string): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const { supabase, user } = await requireUser();
    const offer = await getOffer(offerId);

    // Buyers in other negotiations on this listing, found before the database
    // declines their latest offers.
    let competing: string[] = [];
    if (offer) {
      const { data } = await supabaseAdmin
        .from("offers")
        .select("buyer_id")
        .eq("listing_id", offer.listing_id)
        .eq("status", "submitted")
        .neq("id", offerId);
      competing = Array.from(new Set(((data ?? []) as { buyer_id: string }[]).map((r) => r.buyer_id))).filter(
        (id) => id !== offer.buyer_id
      );
    }

    const { error } = await supabase.rpc("accept_offer", { p_offer_id: offerId });
    if (error) throw new Error(error.message);

    if (offer) {
      const info = await listingInfo(offer.listing_id);
      if (info) {
        if (user.id === offer.buyer_id) {
          await emailUser({
            userId: info.sellerId,
            subject: `Your counter-offer was accepted - ${info.title}`,
            heading: "The buyer accepted your counter-offer",
            lines: [
              `The buyer has accepted ${money(offer.amount)} for ${info.title}.`,
              "Next step: arrange the sale and purchase agreement with your lawyer or conveyancer.",
            ],
            buttonLabel: "View offers",
            path: "/account/offers",
            label: "offer.accepted_by_buyer",
          });
        } else {
          await safeSend(async () => {
            const buyer = await getProfile(offer.buyer_id);
            if (!buyer?.email) return;
            await sendEmail({
              to: buyer.email,
              subject: "Your offer was accepted",
              react: OfferAccepted({ amount: offer.amount, listingTitle: info.title }),
            });
          }, "offer.accepted");
        }
      }
      await notifyAutoDeclined(competing, offer.listing_id);
    }

    revalidatePath("/account/offers");
    return { id: offerId };
  });
}

// ---- Decline / withdraw ------------------------------------------------------
export async function declineOffer(offerId: string, reason?: string): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const { supabase, user } = await requireUser();
    const offer = await getOffer(offerId);

    const { error } = await supabase.rpc("decline_offer", {
      p_offer_id: offerId,
      p_reason: reason ?? null,
    });
    if (error) throw new Error(error.message);

    if (offer) {
      const info = await listingInfo(offer.listing_id);
      const myRole = user.id === offer.buyer_id ? "buyer" : "seller";
      const withdrew = offer.proposed_by === myRole;
      const why = reason?.trim() || undefined;

      if (info) {
        if (withdrew) {
          await emailUser({
            userId: myRole === "buyer" ? info.sellerId : offer.buyer_id,
            subject: `Offer withdrawn - ${info.title}`,
            heading: myRole === "buyer" ? "A buyer withdrew their offer" : "The seller withdrew their counter-offer",
            lines: [
              `The ${money(offer.amount)} ${myRole === "buyer" ? "offer" : "counter-offer"} on ${info.title} has been withdrawn.`,
              why ? `Reason: ${why}` : "",
            ],
            buttonLabel: "View offers",
            path: "/account/offers",
            label: "offer.withdrawn",
          });
        } else if (myRole === "seller") {
          await safeSend(async () => {
            const buyer = await getProfile(offer.buyer_id);
            if (!buyer?.email) return;
            await sendEmail({
              to: buyer.email,
              subject: `Update on your offer - ${info.title}`,
              react: OfferDeclined({ amount: offer.amount, listingTitle: info.title, reason: why }),
            });
          }, "offer.declined");
        } else {
          await emailUser({
            userId: info.sellerId,
            subject: `Counter-offer declined - ${info.title}`,
            heading: "The buyer declined your counter-offer",
            lines: [
              `The buyer declined your ${money(offer.amount)} counter-offer on ${info.title}.`,
              why ? `Reason: ${why}` : "",
            ],
            buttonLabel: "View offers",
            path: "/account/offers",
            label: "offer.counter_declined",
          });
        }
      }
    }

    revalidatePath("/account/offers");
    return { id: offerId };
  });
}