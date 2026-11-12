// New Zealand time helpers. Servers (Vercel) run in UTC, so every date shown
// or entered is converted explicitly to and from Pacific/Auckland. This also
// handles daylight saving correctly.

export const NZ_TZ = "Pacific/Auckland";

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: NZ_TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function nzOffsetMs(utcMs: number): number {
  const p: Record<string, string> = {};
  for (const part of partsFormatter.formatToParts(new Date(utcMs))) p[part.type] = part.value;
  const hour = p.hour === "24" ? 0 : Number(p.hour);
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    hour,
    Number(p.minute),
    Number(p.second)
  );
  return asUtc - utcMs;
}

/** Converts a New Zealand date ("2026-11-08") and time ("13:30") to a Date. */
export function nzWallTimeToDate(date: string, time: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;
  const wall = Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2]));
  let utc = wall - nzOffsetMs(wall);
  utc = wall - nzOffsetMs(utc);
  return new Date(utc);
}

/** Today's date in New Zealand, as YYYY-MM-DD (for date input minimums). */
export function nzToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: NZ_TZ });
}

export function formatNzDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NZ", {
    timeZone: NZ_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatNzTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-NZ", {
    timeZone: NZ_TZ,
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatNzRange(startIso: string, endIso: string): string {
  return `${formatNzDate(startIso)}, ${formatNzTime(startIso)} \u2013 ${formatNzTime(endIso)}`;
}

export type Slot = { start: string; end: string };

/** Splits a private-viewing window into back-to-back slots. */
export function buildSlots(startsAt: string, endsAt: string, slotMinutes: number): Slot[] {
  const slots: Slot[] = [];
  const step = slotMinutes * 60_000;
  const end = new Date(endsAt).getTime();
  for (let t = new Date(startsAt).getTime(); t + step <= end; t += step) {
    slots.push({ start: new Date(t).toISOString(), end: new Date(t + step).toISOString() });
  }
  return slots;
}