"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { offerFormSchema, type OfferForm } from "./schema";

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
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options));
          } catch { /* ignore */ }
        },
      },
    }
  );
}

async function requireUser() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");
  return { supabase, user };
}

function humaniseError(msg: string): string {
  if (msg.startsWith("OFFER_BELOW_MIN_PRICE:")) {
    const min = Number(msg.split(":")[1]);
    return `Your offer must be at least NZ$${min.toLocaleString()} (75% of the asking price).`;
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

export async function submitOffer(listingId: string, input: OfferForm) {
  const validated = offerFormSchema.parse(input);
  const { supabase } = await requireUser();

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

  if (error) throw new Error(humaniseError(error.message));
  revalidatePath("/account/offers");
  return { id: data as string };
}

export async function counterOffer(offerId: string, amount: number, notes?: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("counter_offer", {
    p_offer_id: offerId,
    p_amount: amount,
    p_notes: notes ?? null,
  });
  if (error) throw new Error(humaniseError(error.message));
  revalidatePath("/account/offers");
  return { id: data as string };
}

export async function acceptOffer(offerId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("accept_offer", { p_offer_id: offerId });
  if (error) throw new Error(humaniseError(error.message));
  revalidatePath("/account/offers");
  return { ok: true };
}

export async function declineOffer(offerId: string, reason?: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("decline_offer", {
    p_offer_id: offerId,
    p_reason: reason ?? null,
  });
  if (error) throw new Error(humaniseError(error.message));
  revalidatePath("/account/offers");
  return { ok: true };
}