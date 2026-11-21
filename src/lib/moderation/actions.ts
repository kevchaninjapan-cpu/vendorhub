"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { emailUser, listingInfo } from "@/lib/email/notify";

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
          } catch { /* ignore in RSC */ }
        },
      },
    }
  );
}

async function requireAdmin() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["moderator", "admin"].includes(profile.role)) {
    redirect("/");
  }
  return { supabase, user };
}

// ---------- Approve a listing ---------------------------------------------
export async function approveListing(listingId: string, notes?: string) {
  const { supabase } = await requireAdmin();

  const { data: listing } = await supabase
    .from("listings")
    .select("id, dvr_record_id, auckland_rate_assessment_id, valuation_estimate")
    .eq("id", listingId)
    .single();
  if (!listing) throw new Error("Listing not found");

  const { error } = await supabase
    .from("listings")
    .update({
      status: "live",
      moderation_notes: notes ?? null,
      rejected_reason: null,
    })
    .eq("id", listingId);

  if (error) throw new Error(error.message);

  // Refresh the search materialised view so the listing shows up immediately
  await supabase.rpc("refresh_listings_search");

  const info = await listingInfo(listingId);
  if (info) {
    await emailUser({
      userId: info.sellerId,
      subject: `Your listing is live - ${info.title}`,
      heading: "Your listing is live",
      lines: [
        `${info.title} has been approved and buyers can now find it on VendorHub.`,
        "Next steps: add open home times, and upload a LIM and record of title to earn the Ready to buy badge.",
      ],
      buttonLabel: "View your listing",
      path: info.publicPath,
      label: "listing.approved",
    });
  }

  revalidatePath("/(admin)/moderation/queue");
  revalidatePath("/account/listings");
  return { ok: true };
}

// ---------- Reject a listing ----------------------------------------------
export async function rejectListing(listingId: string, reason: string) {
  if (!reason || reason.trim().length < 5) {
    throw new Error("Please provide a rejection reason (min 5 chars)");
  }

  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("listings")
    .update({
      status: "rejected",
      rejected_reason: reason,
    })
    .eq("id", listingId);

  if (error) throw new Error(error.message);

  const info = await listingInfo(listingId);
  if (info) {
    await emailUser({
      userId: info.sellerId,
      subject: `Changes needed - ${info.title}`,
      heading: "Your listing needs a few changes",
      lines: [
        `We couldn't approve ${info.title} yet. Here's what needs changing:`,
        reason.trim(),
        "Make the changes, then submit the listing for review again.",
      ],
      buttonLabel: "Edit your listing",
      path: `/account/listings/${listingId}/edit`,
      label: "listing.rejected",
    });
  }

  revalidatePath("/(admin)/moderation/queue");
  revalidatePath("/account/listings");
  return { ok: true };
}

// ---------- Withdraw on behalf of seller (admin tool) ---------------------
export async function adminWithdrawListing(listingId: string, notes?: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("listings")
    .update({ status: "withdrawn", moderation_notes: notes ?? null })
    .eq("id", listingId);
  if (error) throw new Error(error.message);
  await supabase.rpc("refresh_listings_search");
  revalidatePath("/(admin)/moderation/queue");
  return { ok: true };
}