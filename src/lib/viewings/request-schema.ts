import { z } from "zod";

// ISO weekdays: 1 = Monday ... 7 = Sunday (matches Postgres isodow).
export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const MAX_REQUEST_DAYS = 28;
export const REQUEST_LENGTH_OPTIONS = [15, 20, 30, 45, 60, 90, 120];

export type RequestStatus =
  | "pending"
  | "proposed"
  | "confirmed"
  | "declined"
  | "withdrawn"
  | "expired"
  | "cancelled";

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pending: "Waiting for the seller",
  proposed: "Time suggested",
  confirmed: "Confirmed",
  declined: "Declined",
  withdrawn: "Withdrawn",
  expired: "Expired",
  cancelled: "Cancelled",
};

export function isOpenRequest(status: RequestStatus): boolean {
  return status === "pending" || status === "proposed";
}

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const timeRe = /^\d{2}:\d{2}$/;

export const viewingRequestInputSchema = z.object({
  listing_id: z.string().uuid(),
  date_from: z.string().regex(dateRe, "Choose a start date."),
  date_to: z.string().regex(dateRe, "Choose an end date."),
  days: z.array(z.number().int().min(1).max(7)).min(1, "Choose at least one day."),
  time_from: z.string().regex(timeRe, "Choose an earliest time."),
  time_to: z.string().regex(timeRe, "Choose a latest time."),
  note: z.string().max(500).optional(),
  name: z.string().trim().min(2, "Please enter your name.").max(100),
  phone: z.string().trim().min(7, "Please enter a phone number the seller can reach you on.").max(30),
});
export type ViewingRequestInput = z.input<typeof viewingRequestInputSchema>;

export type ViewingRequest = {
  id: string;
  listing_id: string;
  buyer_id: string;
  buyer_name: string;
  buyer_phone: string;
  date_from: string;
  date_to: string;
  days: number[];
  time_from: string;
  time_to: string;
  note: string | null;
  status: RequestStatus;
  proposed_starts_at: string | null;
  proposed_ends_at: string | null;
  viewing_id: string | null;
  decline_reason: string | null;
  created_at: string;
};

export type ThreadMessage = {
  id: string;
  sender_id: string | null;
  kind: "text" | "system";
  body: string;
  created_at: string;
};

export type Thread = { id: string; messages: ThreadMessage[]; unread: number };

export type OwnerRequest = ViewingRequest & { thread: Thread | null };

export type BuyerRequestState = {
  accepts: boolean;
  viewerId: string | null;
  request: ViewingRequest | null;
  thread: Thread | null;
};

// ---- Plain-date helpers (calendar dates, no time zone involved) ------------

function utcMs(date: string): number {
  return Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
}

export function addDays(date: string, n: number): string {
  return new Date(utcMs(date) + n * 86_400_000).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((utcMs(to) - utcMs(from)) / 86_400_000);
}

export function isoWeekday(date: string): number {
  const w = new Date(utcMs(date)).getUTCDay();
  return w === 0 ? 7 : w;
}

export function formatDateOnly(date: string): string {
  return new Date(utcMs(date)).toLocaleDateString("en-NZ", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function toMinutes(t: string): number {
  return Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
}

export function formatClock(t: string): string {
  const h = Number(t.slice(0, 2));
  const m = Number(t.slice(3, 5));
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, "0")}${suffix}`;
}

export function joinDays(days: number[]): string {
  const labels = [...days].sort((a, b) => a - b).map((d) => DAY_LABELS[d - 1]);
  if (labels.length === 7) return "Any day";
  if (labels.length <= 1) return labels.join("");
  return labels.slice(0, -1).join(", ") + " or " + labels[labels.length - 1];
}

export function describeAvailability(r: {
  days: number[];
  time_from: string;
  time_to: string;
  date_from: string;
  date_to: string;
}): string {
  return `${joinDays(r.days)}, ${formatClock(r.time_from)}\u2013${formatClock(r.time_to)}, ${formatDateOnly(
    r.date_from
  )} to ${formatDateOnly(r.date_to)}`;
}

/** Dates in the request that fall on one of the buyer's days, from fromDate on. */
export function matchingDates(
  r: { days: number[]; date_from: string; date_to: string },
  fromDate: string
): string[] {
  const out: string[] = [];
  let d = r.date_from > fromDate ? r.date_from : fromDate;
  while (d <= r.date_to && out.length < 40) {
    if (r.days.includes(isoWeekday(d))) out.push(d);
    d = addDays(d, 1);
  }
  return out;
}