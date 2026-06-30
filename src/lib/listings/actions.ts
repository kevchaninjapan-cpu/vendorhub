"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import {
  addressStepSchema,
  detailsStepSchema,
} from "./schema";
import type { ListingDraft } from "@/types/marketplace";

// ─── Supabase server client ────────────────────────────────────────────────
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

async function requireUser() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  return { supabase, user };
}

// ─── Row shape for loadDraft ───────────────────────────────────────────────
type ListingRow = {
  id: string;
  pack_tier: "starter" | "pro" | "elite";
  dvr_record_id: string | null;
  auckland_rate_assessment_id: string | null;
  formatted_address: string | null;
  address_norm: string | null;
  street_address: string | null;
  suburb: string | null;
  region: string | null;
  postcode: string | null;
  display_address_masked: boolean | null;
  property_type:
    | "house" | "apartment" | "townhouse" | "unit"
    | "section" | "lifestyle" | "other" | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  floor_area_sqm: number | null;
  land_area_sqm: number | null;
  year_built: number | null;
  chattels: string[] | null;
  headline: string | null;
  description: string | null;
  method_of_sale: "asking_price" | "negotiation" | "tender" | "beo" | null;
  asking_price: number | null;
  price_text: string | null;
  tender_close_at: string | null;
  beo_amount: number | null;
  disclosures: Record<string, unknown> | null;
  status: string;
  member_id: string;
};

// ─── Load existing listing into wizard ─────────────────────────────────────
export async function loadDraft(listingId: string): Promise<ListingDraft> {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, pack_tier, dvr_record_id, auckland_rate_assessment_id, " +
      "formatted_address, address_norm, street_address, suburb, region, postcode, " +
      "display_address_masked, property_type, bedrooms, bathrooms, parking, " +
      "floor_area_sqm, land_area_sqm, year_built, chattels, headline, description, " +
      "method_of_sale, asking_price, price_text, tender_close_at, beo_amount, " +
      "disclosures, status, member_id"
    )
    .eq("id", listingId)
    .returns<ListingRow[]>()
    .single();

  if (error || !data) throw new Error("Listing not found");
  if (data.member_id !== user.id) throw new Error("Not allowed");

  if (!["draft", "rejected"].includes(data.status)) {
    throw new Error(`Cannot edit a listing in status "${data.status}"`);
  }

  return {
    id: data.id,
    pack_tier: data.pack_tier,
    dvr_record_id: data.dvr_record_id,
    auckland_rate_assessment_id: data.auckland_rate_assessment_id,
    formatted_address: data.formatted_address,
    address_norm: data.address_norm,
    street_address: data.street_address,
    suburb: data.suburb,
    region: data.region,
    postcode: data.postcode,
    display_address_masked: data.display_address_masked ?? true,
    property_type: data.property_type,
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    parking: data.parking,
    floor_area_sqm: data.floor_area_sqm,
    land_area_sqm: data.land_area_sqm,
    year_built: data.year_built,
    chattels: data.chattels ?? [],
    headline: data.headline,
    description: data.description,
    method_of_sale: data.method_of_sale,
    asking_price: data.asking_price,
    price_text: data.price_text,
    tender_close_at: data.tender_close_at,
    beo_amount: data.beo_amount,
    disclosures: (data.disclosures as ListingDraft["disclosures"]) ?? {},
  };
}

// ─── Create or update draft ────────────────────────────────────────────────
export async function createOrUpdateDraft(
  input: Partial<ListingDraft> & { id?: string }
) {
  const { supabase, user } = await requireUser();

 // Helper: convert "" to null so Postgres doesn't choke on typed columns
const emptyToNull = <T>(v: T): T | null =>
  typeof v === "string" && v.trim() === "" ? null : v;

const payload: Record<string, unknown> = {
  member_id: user.id,
  status: "draft",
  pack_tier: input.pack_tier ?? "starter",
  dvr_record_id: emptyToNull(input.dvr_record_id ?? null),
  auckland_rate_assessment_id: emptyToNull(input.auckland_rate_assessment_id ?? null),
  formatted_address: emptyToNull(input.formatted_address ?? null),
  address_norm: emptyToNull(input.address_norm ?? null),
  street_address: emptyToNull(input.street_address ?? null),
  suburb: emptyToNull(input.suburb ?? null),
  region: emptyToNull(input.region ?? null),
  postcode: emptyToNull(input.postcode ?? null),
  property_type: emptyToNull(input.property_type ?? null),
  bedrooms: input.bedrooms ?? null,
  bathrooms: input.bathrooms ?? null,
  parking: input.parking ?? null,
  floor_area_sqm: input.floor_area_sqm ?? null,
  land_area_sqm: input.land_area_sqm ?? null,
  year_built: input.year_built ?? null,
  chattels: input.chattels ?? [],
  headline: emptyToNull(input.headline ?? null),
  description: emptyToNull(input.description ?? null),
  method_of_sale: emptyToNull(input.method_of_sale ?? null),
  asking_price: input.asking_price ?? null,
  price_text: emptyToNull(input.price_text ?? null),
  tender_close_at: emptyToNull(input.tender_close_at ?? null),
  beo_amount: input.beo_amount ?? null,
  disclosures: input.disclosures ?? {},
};

  if (typeof input.lat === "number" && typeof input.lng === "number") {
    payload.geom = `SRID=4326;POINT(${input.lng} ${input.lat})`;
  }

  let id = input.id;
  if (id) {
    payload.status = "draft";
    payload.rejected_reason = null;

    const { error } = await supabase
      .from("listings")
      .update(payload)
      .eq("id", id)
      .eq("member_id", user.id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase
      .from("listings")
      .insert(payload)
      .select("id")
      .returns<{ id: string }[]>()
      .single();
    if (error) throw new Error(error.message);
    id = data.id;
  }

  revalidatePath("/account/listings");
  return { id: id! };
}

export async function saveDraft(input: Partial<ListingDraft> & { id?: string }) {
  return createOrUpdateDraft(input);
}

// ─── Media: record an upload + delete ──────────────────────────────────────
export async function recordMediaUpload(args: {
  listingId: string;
  storagePath: string;
  type?: "photo" | "floor_plan" | "video" | "tour_3d";
  isCover?: boolean;
  sortOrder?: number;
}) {
  const { supabase, user } = await requireUser();

  const { data: listing } = await supabase
    .from("listings")
    .select("id, member_id")
    .eq("id", args.listingId)
    .returns<{ id: string; member_id: string }[]>()
    .single();
  if (!listing || listing.member_id !== user.id) throw new Error("Not allowed");

  if (args.isCover) {
    await supabase.from("listing_media")
      .update({ is_cover: false })
      .eq("listing_id", args.listingId);
  }

  const publicUrl = supabase.storage
    .from("listing-media")
    .getPublicUrl(args.storagePath).data.publicUrl;

  const { data, error } = await supabase
    .from("listing_media")
    .insert({
      listing_id: args.listingId,
      type: args.type ?? "photo",
      storage_path: args.storagePath,
      public_url: publicUrl,
      is_cover: !!args.isCover,
      sort_order: args.sortOrder ?? 0,
    })
    .select("id, public_url")
    .returns<{ id: string; public_url: string | null }[]>()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteMedia(mediaId: string) {
  const { supabase, user } = await requireUser();

  const { data: row } = await supabase
    .from("listing_media")
    .select("id, listing_id, storage_path, listings!inner(member_id)")
    .eq("id", mediaId)
    .single();

  const owner = (row as any)?.listings?.member_id;
  const storagePath = (row as any)?.storage_path as string | undefined;
  if (!row || owner !== user.id || !storagePath) throw new Error("Not allowed");

  await supabase.storage.from("listing-media").remove([storagePath]);
  await supabase.from("listing_media").delete().eq("id", mediaId);
  return { ok: true };
}

// ─── Submit for moderation ─────────────────────────────────────────────────
export async function submitForReview(listingId: string, payload: ListingDraft) {
  const { supabase, user } = await requireUser();

  addressStepSchema.parse({
    dvr_record_id: payload.dvr_record_id,
    auckland_rate_assessment_id: payload.auckland_rate_assessment_id,
    formatted_address: payload.formatted_address,
    address_norm: payload.address_norm,
    street_address: payload.street_address,
    suburb: payload.suburb,
    region: payload.region,
    postcode: payload.postcode,
    lat: payload.lat ?? 0,
    lng: payload.lng ?? 0,
  });
  detailsStepSchema.parse({
    pack_tier: payload.pack_tier,
    property_type: payload.property_type!,
    bedrooms: payload.bedrooms ?? 0,
    bathrooms: payload.bathrooms ?? 0,
    parking: payload.parking ?? 0,
    floor_area_sqm: payload.floor_area_sqm ?? null,
    land_area_sqm: payload.land_area_sqm ?? null,
    year_built: payload.year_built ?? null,
    chattels: payload.chattels ?? [],
    headline: payload.headline ?? "",
    description: payload.description ?? "",
    method_of_sale: payload.method_of_sale!,
    asking_price: payload.asking_price ?? null,
    price_text: payload.price_text ?? null,
    tender_close_at: payload.tender_close_at ?? null,
    beo_amount: payload.beo_amount ?? null,
  });

  const { data: media } = await supabase
    .from("listing_media")
    .select("id, is_cover")
    .eq("listing_id", listingId)
    .returns<{ id: string; is_cover: boolean }[]>();

  if (!media || media.length < 4) throw new Error("Add at least 4 photos");
  if (!media.some((m) => m.is_cover)) throw new Error("Choose a cover photo");

  const { error } = await supabase
    .from("listings")
    .update({
      status: "pending_review",
      disclosures: payload.disclosures ?? {},
      rejected_reason: null,
    })
    .eq("id", listingId)
    .eq("member_id", user.id);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: "submit_for_review",
    target_type: "listing",
    target_id: listingId,
  });

  revalidatePath("/account/listings");
  return { ok: true };
}

// ─── Seller withdraws a live or pending listing ────────────────────────────
export async function withdrawListing(listingId: string) {
  const { supabase, user } = await requireUser();

  const { data: listing } = await supabase
    .from("listings")
    .select("id, member_id, status")
    .eq("id", listingId)
    .returns<{ id: string; member_id: string; status: string }[]>()
    .single();

  if (!listing || listing.member_id !== user.id) throw new Error("Not allowed");
  if (!["live", "under_offer", "pending_review"].includes(listing.status)) {
    throw new Error(`Cannot withdraw a listing in status "${listing.status}"`);
  }

  const { error } = await supabase
    .from("listings")
    .update({ status: "withdrawn" })
    .eq("id", listingId);
  if (error) throw new Error(error.message);

  // Refresh the search view, but don't fail the action if the RPC errors.
  // `.rpc()` returns a builder, not a promise, so we await it first
  // and then catch any failure separately.
  try {
    await supabase.rpc("refresh_listings_search");
  } catch {
    /* non-fatal */
  }

  revalidatePath("/account/listings");
  return { ok: true };
}