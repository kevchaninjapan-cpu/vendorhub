"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { ZodError } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email/client";
import ViewingBooked from "@/lib/email/templates/viewing-booked";
import ViewingConfirmed from "@/lib/email/templates/viewing-confirmed";
import ViewingCancelled from "@/lib/email/templates/viewing-cancelled";
import type { ActionResult } from "@/lib/documents/schema";
import {
  sessionInputSchema,
  bookingInputSchema,
  MAX_SESSION_HOURS,
  type SessionInput,
  type BookingInput,
  type AvailabilitySession,
  type MyBooking,
  type OwnerBooking,
  type OwnerSession,
  type ViewingKind,
} from "./schema";
import { nzWallTimeToDate, formatNzRange } from "./time";

// Actions RETURN { ok, error } instead of throwing, so the message reaches
// the user in production (Next.js hides messages thrown from server actions).

const ERRORS: Record<string, string> = {
  AUTH_REQUIRED: "Please sign in to book.",
  NAME_REQUIRED: "Please enter your name.",
  PHONE_REQUIRED: "Please enter a phone number the seller can reach you on.",
  SESSION_NOT_FOUND: "That session no longer exists.",
  SESSION_CANCELLED: "The seller has cancelled this session.",
  LISTING_NOT_AVAILABLE: "This listing isn't currently available.",
  OWN_LISTING: "You can't book a viewing of your own listing.",
  SESSION_PAST: "That time has already passed.",
  SESSION_FULL: "This open home is full.",
  SLOT_REQUIRED: "Please choose a time.",
  SLOT_INVALID: "That time isn't available.",
  SLOT_TAKEN: "Someone has just booked that time. Please choose another.",
  ALREADY_BOOKED: "You're already booked for this session.",
  VIEWING_NOT_FOUND: "That booking no longer exists.",
  NOT_PARTICIPANT: "You can't change this booking.",
  NOT_LISTING_OWNER: "You can only manage your own listings.",
};

type SessionTimes = {
  kind: ViewingKind;
  starts_at: string;
  ends_at: string;
  slot_minutes: number;
};

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
    console.error("[viewings]", e);
    if (e instanceof ZodError) {
      return { ok: false, error: e.issues[0]?.message ?? "Some details are missing or invalid." };
    }
    const msg = e instanceof Error ? e.message : "Something went wrong. Please try again.";
    return { ok: false, error: ERRORS[msg] ?? msg };
  }
}

async function assertOwner(supabase: SupabaseServer, listingId: string, userId: string) {
  const { data, error } = await supabase
    .from("listings")
    .select("member_id")
    .eq("id", listingId)
    .maybeSingle<{ member_id: string }>();
  if (error) throw new Error(error.message);
  if (!data || data.member_id !== userId) throw new Error("NOT_LISTING_OWNER");
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

// Never let an email failure undo a booking.
async function safeSend(fn: () => Promise<unknown>, label: string) {
  try {
    await fn();
  } catch (e) {
    console.error(`[viewings] ${label} email failed:`, e);
  }
}

function describeTime(s: SessionTimes, slotStart: string | null): string {
  if (s.kind === "private" && slotStart) {
    const end = new Date(new Date(slotStart).getTime() + s.slot_minutes * 60_000).toISOString();
    return formatNzRange(slotStart, end);
  }
  return formatNzRange(s.starts_at, s.ends_at);
}

// ---- Seller: create a session ----------------------------------------------
export async function createSession(input: SessionInput): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const v = sessionInputSchema.parse(input);
    const { supabase, user } = await requireUser();
    await assertOwner(supabase, v.listing_id, user.id);

    const starts = nzWallTimeToDate(v.date, v.start_time);
    const ends = nzWallTimeToDate(v.date, v.end_time);
    if (!starts || !ends) throw new Error("Please check the date and times.");
    if (starts.getTime() <= Date.now()) throw new Error("That start time has already passed.");
    if (ends.getTime() <= starts.getTime()) throw new Error("The end time must be after the start time.");
    if (ends.getTime() - starts.getTime() > MAX_SESSION_HOURS * 3_600_000) {
      throw new Error(`Sessions can be up to ${MAX_SESSION_HOURS} hours long.`);
    }
    if (v.kind === "private" && ends.getTime() - starts.getTime() < v.slot_minutes * 60_000) {
      throw new Error("The session is shorter than one viewing slot.");
    }

    const { data, error } = await supabase
      .from("listing_open_homes")
      .insert({
        listing_id: v.listing_id,
        kind: v.kind,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        slot_minutes: v.slot_minutes,
        max_attendees: v.kind === "open_home" ? v.max_attendees ?? null : null,
        notes: v.notes?.trim() || null,
      })
      .select("id")
      .single<{ id: string }>();

    if (error) throw new Error(error.message);

    revalidatePath(managePath(v.listing_id));
    return { id: data.id };
  });
}

// ---- Seller: cancel a whole session ----------------------------------------
export async function cancelSession(sessionId: string): Promise<ActionResult<{ cancelledBookings: number }>> {
  return run(async () => {
    const { supabase } = await requireUser();

    const { data: sessionRow } = await supabase
      .from("listing_open_homes")
      .select("id, listing_id, kind, starts_at, ends_at, slot_minutes")
      .eq("id", sessionId)
      .maybeSingle();
    if (!sessionRow) throw new Error("SESSION_NOT_FOUND");
    const s = sessionRow as SessionTimes & { id: string; listing_id: string };

    // Read the bookings first, so the buyers can be told.
    const { data: booked } = await supabase
      .from("viewings")
      .select("buyer_id, slot_starts_at")
      .eq("open_home_id", sessionId)
      .eq("status", "booked");

    const { data: n, error } = await supabase.rpc("cancel_open_home", { p_open_home_id: sessionId });
    if (error) throw new Error(error.message);

    const listing = await getListingInfo(s.listing_id);
    if (listing) {
      for (const b of (booked ?? []) as { buyer_id: string; slot_starts_at: string | null }[]) {
        await safeSend(async () => {
          const to = await getEmail(b.buyer_id);
          if (!to) return;
          await sendEmail({
            to,
            subject: `Viewing cancelled - ${listing.title}`,
            react: ViewingCancelled({
              listingTitle: listing.title,
              when: describeTime(s, b.slot_starts_at),
              cancelledBy: "seller",
              url: listing.url,
            }),
          });
        }, "session.cancelled");
      }
    }

    revalidatePath(managePath(s.listing_id));
    return { cancelledBookings: Number(n ?? 0) };
  });
}

// ---- Buyer: book -----------------------------------------------------------
export async function bookViewing(input: BookingInput): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const v = bookingInputSchema.parse(input);
    const { supabase, user } = await requireUser();

    const { data, error } = await supabase.rpc("book_viewing", {
      p_open_home_id: v.open_home_id,
      p_slot_starts_at: v.slot_starts_at,
      p_name: v.name,
      p_phone: v.phone,
    });
    if (error) throw new Error(error.message);
    const viewingId = data as string;

    const { data: sessionRow } = await supabase
      .from("listing_open_homes")
      .select("listing_id, kind, starts_at, ends_at, slot_minutes")
      .eq("id", v.open_home_id)
      .maybeSingle();
    const s = sessionRow as (SessionTimes & { listing_id: string }) | null;

    if (s) {
      const listing = await getListingInfo(s.listing_id);
      if (listing) {
        const when = describeTime(s, v.slot_starts_at);

        await safeSend(async () => {
          const to = await getEmail(listing.sellerId);
          if (!to) return;
          await sendEmail({
            to,
            subject: `New viewing booked - ${listing.title}`,
            react: ViewingBooked({
              listingTitle: listing.title,
              when,
              buyerName: v.name,
              buyerPhone: v.phone,
              kind: s.kind,
              manageUrl: siteUrl() + managePath(s.listing_id),
            }),
          });
        }, "viewing.booked");

        await safeSend(async () => {
          if (!user.email) return;
          await sendEmail({
            to: user.email,
            subject: `Viewing confirmed - ${listing.title}`,
            react: ViewingConfirmed({ listingTitle: listing.title, when, kind: s.kind, url: listing.url }),
          });
        }, "viewing.confirmed");
      }
      revalidatePath(managePath(s.listing_id));
    }

    return { id: viewingId };
  });
}

// ---- Buyer or seller: cancel one booking -----------------------------------
export async function cancelViewing(viewingId: string): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const { supabase, user } = await requireUser();

    const { data: row } = await supabase
      .from("viewings")
      .select("id, listing_id, buyer_id, open_home_id, slot_starts_at, status")
      .eq("id", viewingId)
      .maybeSingle();
    if (!row) throw new Error("VIEWING_NOT_FOUND");
    const b = row as {
      id: string;
      listing_id: string;
      buyer_id: string;
      open_home_id: string | null;
      slot_starts_at: string | null;
      status: string;
    };

    const { error } = await supabase.rpc("cancel_viewing", { p_viewing_id: viewingId });
    if (error) throw new Error(error.message);

    if (b.status === "booked" && b.open_home_id) {
      const { data: sessionRow } = await supabase
        .from("listing_open_homes")
        .select("kind, starts_at, ends_at, slot_minutes")
        .eq("id", b.open_home_id)
        .maybeSingle();
      const s = sessionRow as SessionTimes | null;
      const listing = await getListingInfo(b.listing_id);

      if (s && listing) {
        const buyerCancelled = user.id === b.buyer_id;
        await safeSend(async () => {
          const to = await getEmail(buyerCancelled ? listing.sellerId : b.buyer_id);
          if (!to) return;
          await sendEmail({
            to,
            subject: `Viewing cancelled - ${listing.title}`,
            react: ViewingCancelled({
              listingTitle: listing.title,
              when: describeTime(s, b.slot_starts_at),
              cancelledBy: buyerCancelled ? "buyer" : "seller",
              url: buyerCancelled ? siteUrl() + managePath(b.listing_id) : listing.url,
            }),
          });
        }, "viewing.cancelled");
      }
    }

    revalidatePath(managePath(b.listing_id));
    return { id: viewingId };
  });
}

// ---- Reads -----------------------------------------------------------------

// Public: upcoming sessions and which slots are taken. No buyer identities.
export async function getViewingAvailability(listingId: string): Promise<AvailabilitySession[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("get_listing_viewing_availability", {
    p_listing_id: listingId,
  });
  if (error) {
    console.error("[viewings] availability failed:", error);
    return [];
  }
  return ((data ?? []) as AvailabilitySession[]).map((s) => ({
    ...s,
    taken_slots: s.taken_slots ?? [],
  }));
}

// The signed-in buyer's own active bookings on a listing.
export async function getMyBookings(listingId: string): Promise<MyBooking[]> {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("viewings")
    .select("id, open_home_id, slot_starts_at")
    .eq("listing_id", listingId)
    .eq("buyer_id", user.id)
    .eq("status", "booked");
  return (data ?? []) as MyBooking[];
}

// Pre-fills the booking form from the buyer's own profile, if it has details.
export async function getBookingPrefill(): Promise<{ name: string; phone: string }> {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { name: "", phone: "" };

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const p = (data ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    name: str(p.full_name),
    phone: str(p.phone) || str(p.mobile) || str(p.phone_number),
  };
}

// Seller: upcoming sessions with the people booked into each.
export async function listSessionsForOwner(listingId: string): Promise<OwnerSession[]> {
  const { supabase } = await requireUser();

  const { data: sessionRows, error } = await supabase
    .from("listing_open_homes")
    .select("id, kind, starts_at, ends_at, slot_minutes, max_attendees, notes")
    .eq("listing_id", listingId)
    .is("cancelled_at", null)
    .gte("ends_at", new Date().toISOString())
    .order("starts_at");
  if (error) throw new Error(error.message);

  const sessions = (sessionRows ?? []) as Omit<OwnerSession, "bookings">[];
  if (sessions.length === 0) return [];

  const { data: bookingRows } = await supabase
    .from("viewings")
    .select("id, open_home_id, buyer_name, buyer_phone, slot_starts_at, created_at")
    .in(
      "open_home_id",
      sessions.map((s) => s.id)
    )
    .eq("status", "booked")
    .order("created_at");

  const bySession = new Map<string, OwnerBooking[]>();
  for (const b of (bookingRows ?? []) as (OwnerBooking & { open_home_id: string })[]) {
    const list = bySession.get(b.open_home_id) ?? [];
    list.push({
      id: b.id,
      buyer_name: b.buyer_name,
      buyer_phone: b.buyer_phone,
      slot_starts_at: b.slot_starts_at,
      created_at: b.created_at,
    });
    bySession.set(b.open_home_id, list);
  }

  return sessions.map((s) => {
    const bookings = bySession.get(s.id) ?? [];
    if (s.kind === "private") {
      bookings.sort((a, b) => String(a.slot_starts_at).localeCompare(String(b.slot_starts_at)));
    }
    return { ...s, bookings };
  });
}