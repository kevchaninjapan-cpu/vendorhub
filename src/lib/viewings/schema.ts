import { z } from "zod";

export const VIEWING_KINDS = ["open_home", "private"] as const;
export type ViewingKind = (typeof VIEWING_KINDS)[number];

export const VIEWING_KIND_LABELS: Record<ViewingKind, string> = {
  open_home: "Open home",
  private: "Private viewings",
};

export const SLOT_MINUTE_OPTIONS = [10, 15, 20, 30, 45, 60] as const;
export const DEFAULT_SLOT_MINUTES = 20;
export const MAX_SESSION_HOURS = 6;

export const sessionInputSchema = z.object({
  listing_id: z.string().uuid(),
  kind: z.enum(VIEWING_KINDS),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Choose a start time."),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Choose an end time."),
  slot_minutes: z.number().int().min(10).max(120).default(DEFAULT_SLOT_MINUTES),
  max_attendees: z.number().int().min(1).max(500).nullable().optional(),
  notes: z.string().max(300).optional(),
});
export type SessionInput = z.input<typeof sessionInputSchema>;

export const bookingInputSchema = z.object({
  open_home_id: z.string().uuid(),
  slot_starts_at: z.string().nullable(),
  name: z.string().trim().min(2, "Please enter your name.").max(100),
  phone: z.string().trim().min(7, "Please enter a phone number the seller can reach you on.").max(30),
});
export type BookingInput = z.input<typeof bookingInputSchema>;

// What any visitor can see about a listing's sessions. No buyer identities.
export type AvailabilitySession = {
  id: string;
  kind: ViewingKind;
  starts_at: string;
  ends_at: string;
  slot_minutes: number;
  max_attendees: number | null;
  notes: string | null;
  booked_count: number;
  taken_slots: string[];
};

export type MyBooking = {
  id: string;
  open_home_id: string | null;
  slot_starts_at: string | null;
};

export type OwnerBooking = {
  id: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  slot_starts_at: string | null;
  created_at: string;
};

export type OwnerSession = {
  id: string;
  kind: ViewingKind;
  starts_at: string;
  ends_at: string;
  slot_minutes: number;
  max_attendees: number | null;
  notes: string | null;
  bookings: OwnerBooking[];
};