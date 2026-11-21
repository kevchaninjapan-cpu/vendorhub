// Per-visitor rate limits for API routes. Server only.
//
// Visitors are identified by user id when signed in, otherwise by a salted
// hash of their IP address (the raw IP is never stored). Counters live in
// the rate_limits table and are only reachable with the server-only key.
// If the counter can't be reached, the request is allowed (fail open) and
// the error is logged, so an outage never blocks real users.
import "server-only";
import { createHash } from "crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Rule = { anon: number; user: number; windowSeconds: number; message: string };

const HOUR = 3600;
const DAY = 86400;

// Edit limits here.
export const RATE_RULES = {
  "valuation-estimate": {
    anon: 5,
    user: 50,
    windowSeconds: DAY,
    message: "You've reached today's limit of free estimates. Sign in for more, or try again tomorrow.",
  },
  "valuation-lookup": {
    anon: 5,
    user: 50,
    windowSeconds: DAY,
    message: "You've reached today's limit of free estimates. Sign in for more, or try again tomorrow.",
  },
  "valuation-search": {
    anon: 100,
    user: 600,
    windowSeconds: HOUR,
    message: "Too many address searches. Please wait a little and try again.",
  },
  "valuation-resolve": {
    anon: 100,
    user: 600,
    windowSeconds: HOUR,
    message: "Too many address lookups. Please wait a little and try again.",
  },
  "marketplace-search": {
    anon: 120,
    user: 600,
    windowSeconds: HOUR,
    message: "Too many searches. Please wait a little and try again.",
  },
  "listing-views": {
    anon: 60,
    user: 120,
    windowSeconds: HOUR,
    message: "Too many requests.",
  },
  enquiries: {
    anon: 20,
    user: 20,
    windowSeconds: HOUR,
    message: "You've sent a lot of messages in a short time. Please wait a little and try again.",
  },
} satisfies Record<string, Rule>;

export type RateBucket = keyof typeof RATE_RULES;

async function identify(): Promise<{ subject: string; signedIn: boolean }> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) return { subject: "u:" + user.id, signedIn: true };
  } catch {
    /* fall through to IP */
  }

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    "unknown";
  const salt = process.env.RATE_LIMIT_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "vendorhub";
  const hash = createHash("sha256").update(salt + "|" + ip).digest("hex").slice(0, 32);
  return { subject: "ip:" + hash, signedIn: false };
}

/** Returns a 429 response if the visitor is over the limit, otherwise null. */
export async function rateLimitResponse(bucket: RateBucket): Promise<NextResponse | null> {
  const rule: Rule = RATE_RULES[bucket];
  try {
    const { subject, signedIn } = await identify();
    const limit = signedIn ? rule.user : rule.anon;
    const { data, error } = await supabaseAdmin.rpc("hit_rate_limit", {
      p_bucket: bucket,
      p_subject: subject,
      p_limit: limit,
      p_window_seconds: rule.windowSeconds,
    });
    if (error) {
      console.error("[rate-limit] check failed, allowing request:", error.message);
      return null;
    }
    if (data === false) {
      return NextResponse.json(
        { error: rule.message },
        { status: 429, headers: { "Retry-After": String(rule.windowSeconds === DAY ? 3600 : 300) } }
      );
    }
    return null;
  } catch (e) {
    console.error("[rate-limit] check failed, allowing request:", e);
    return null;
  }
}