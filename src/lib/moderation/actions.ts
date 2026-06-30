"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

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
  if (!user) redirect("/sign-in");

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

  // Pull the valuation snapshot (if you have it) before going live
  const { data: listing } = await supabase
    .from("listings")
    .select("id, dvr_record_id, auckland_rate_assessment_id, valuation_estimate")
    .eq("id", listingId)
    .single();
  if (!listing) throw new Error("Listing not found");

  // (Optional) Freeze a fresh valuation snapshot at publish time.
  // If you already store valuation_estimate, leave as-is. Otherwise call your
  // estimate API here and update the snapshot fields.

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