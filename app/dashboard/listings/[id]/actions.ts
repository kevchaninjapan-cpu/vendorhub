"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

type ListingStatus = "draft" | "active" | "under_offer" | "sold" | "archived";

const SELLER_ALLOWED_TARGETS = new Set<ListingStatus>(["draft", "active"]);

function isAllowedTransition(current: ListingStatus, next: ListingStatus) {
  if (!SELLER_ALLOWED_TARGETS.has(next)) return false;
  if (current === "draft" && next === "active") return true;
  if (current === "active" && next === "draft") return true;
  return false;
}

// Optional ownership gate for later (Day 19 with RLS)
// Set to your real column when you add it: "user_id" | "owner_id" | "seller_id"
const OWNER_COLUMN: string | null = null;

export async function updateListingStatus(formData: FormData): Promise<void> {
  const listingId = String(formData.get("listingId") ?? "").trim();
  const nextStatus = String(formData.get("nextStatus") ?? "").trim() as ListingStatus;

  if (!listingId) throw new Error("Missing listingId.");

  const allowedStatuses: ListingStatus[] = [
    "draft",
    "active",
    "under_offer",
    "sold",
    "archived",
  ];
  if (!allowedStatuses.includes(nextStatus)) throw new Error("Invalid status value.");
  if (!SELLER_ALLOWED_TARGETS.has(nextStatus)) throw new Error("Action not permitted.");

  const supabase = await createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) throw new Error("Authentication error.");
  if (!user) throw new Error("You must be signed in.");

  const selectCols = OWNER_COLUMN ? `id, status, ${OWNER_COLUMN}` : "id, status";

  const { data: listing, error: fetchErr } = await supabase
    .from("listings")
    .select(selectCols)
    .eq("id", listingId)
    .single();

  // Treat not found / no access the same
  if (fetchErr || !listing) throw new Error("Listing not found.");

  const currentStatus = String((listing as any).status ?? "") as ListingStatus;
  if (!allowedStatuses.includes(currentStatus)) throw new Error("Unknown listing status.");

  if (OWNER_COLUMN) {
    const ownerValue = String((listing as any)[OWNER_COLUMN] ?? "");
    if (!ownerValue) throw new Error("Listing ownership not set.");
    if (ownerValue !== user.id) throw new Error("Access denied.");
  }

  if (!isAllowedTransition(currentStatus, nextStatus)) {
    throw new Error("Transition not permitted.");
  }

  const { error: updateErr } = await supabase
    .from("listings")
    .update({ status: nextStatus })
    .eq("id", listingId);

  if (updateErr) throw new Error("Update failed.");

  revalidatePath("/dashboard/listings");
  revalidatePath(`/dashboard/listings/${listingId}`);
}