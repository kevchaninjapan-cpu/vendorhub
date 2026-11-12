"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/client";
import EnquiryReply from "@/lib/email/templates/enquiry-reply";

const ALLOWED = ["new", "read", "replied", "archived"] as const;
export type EnquiryStatus = (typeof ALLOWED)[number];

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

export async function updateEnquiryStatus(enquiryId: string, status: EnquiryStatus) {
  if (!ALLOWED.includes(status)) return { error: "Invalid status" };

  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required" };

  const { data, error } = await supabase
    .from("enquiries")
    .update({ status })
    .eq("id", enquiryId)
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "Enquiry not found or not yours" };

  revalidatePath("/account/enquiries");
  revalidatePath("/account");
  return { ok: true };
}

export async function sendEnquiryReply(enquiryId: string, rawBody: string) {
  const body = (rawBody ?? "").trim();
  if (!body) return { error: "Reply can't be empty" };
  if (body.length > 5000) return { error: "Reply is too long (5,000 characters max)" };

  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required" };

  // Access rules check the sender is the buyer or the listing's vendor
  const { error } = await supabase
    .from("enquiry_replies")
    .insert({ enquiry_id: enquiryId, sender_id: user.id, body });
  if (error) return { error: "Couldn't send reply: " + error.message };

  // Email the other person. A failed email must never fail the reply itself.
  try {
    const admin = createAdminClient();
    const { data: enquiry } = await admin
      .from("enquiries")
      .select("buyer_id, listings(member_id, headline, formatted_address)")
      .eq("id", enquiryId)
      .single();

    const listing = (enquiry as unknown as {
      buyer_id: string;
      listings: { member_id: string; headline: string | null; formatted_address: string | null } | null;
    } | null);

    if (listing?.listings) {
      const senderIsBuyer = listing.buyer_id === user.id;
      const recipientId = senderIsBuyer ? listing.listings.member_id : listing.buyer_id;
      const { data: recipient } = await admin.auth.admin.getUserById(recipientId);
      const to = recipient?.user?.email;
      if (to && recipientId !== user.id) {
        await sendEmail({
          to,
          subject: senderIsBuyer
            ? "The buyer replied to your enquiry"
            : "The vendor replied to your enquiry",
          react: EnquiryReply({
            listingTitle: listing.listings.headline ?? listing.listings.formatted_address ?? "A listing",
            senderLabel: senderIsBuyer ? "The buyer" : "The vendor",
            message: body,
          }),
        });
      }
    }
  } catch (e) {
    console.error("[enquiries] reply email failed:", e);
  }

  revalidatePath("/account/enquiries");
  revalidatePath("/account");
  return { ok: true };
}
