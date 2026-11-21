import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/client";
import ViewingRequestUpdate from "@/lib/email/templates/viewing-request-update";

// Shared helpers for status emails. Lookups use the server-only key because
// users can't read each other's profiles. Emails never throw: a failed email
// must not undo the action that triggered it.

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "https://vendorhub.co.nz").replace(/\/$/, "");

const toSlug = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "-");

export async function listingInfo(listingId: string) {
  const { data } = await supabaseAdmin
    .from("listings")
    .select("member_id, headline, formatted_address, slug, region, suburb")
    .eq("id", listingId)
    .maybeSingle();
  const l = data as {
    member_id: string;
    headline: string | null;
    formatted_address: string | null;
    slug: string | null;
    region: string | null;
    suburb: string | null;
  } | null;
  if (!l) return null;
  const publicPath =
    l.slug && l.region && l.suburb ? `/listings/${toSlug(l.region)}/${toSlug(l.suburb)}/${l.slug}` : "/buy";
  return { sellerId: l.member_id, title: l.headline ?? l.formatted_address ?? "your listing", publicPath };
}

async function emailFor(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from("profiles").select("email").eq("id", userId).maybeSingle();
  const email = (data as { email: string | null } | null)?.email ?? null;
  if (email) return email;
  const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
  return u?.user?.email ?? null;
}

export async function emailUser(args: {
  userId: string;
  subject: string;
  heading: string;
  lines: string[];
  buttonLabel: string;
  path: string;
  label: string;
}): Promise<void> {
  try {
    const to = await emailFor(args.userId);
    if (!to) return;
    await sendEmail({
      to,
      subject: args.subject,
      react: ViewingRequestUpdate({
        heading: args.heading,
        lines: args.lines.filter(Boolean),
        buttonLabel: args.buttonLabel,
        url: siteUrl() + args.path,
      }),
    });
  } catch (e) {
    console.error(`[email] ${args.label} failed:`, e);
  }
}

// Call BEFORE accept_offer: buyers whose active offers will be auto-declined.
// Excludes the accepted buyer (their own earlier countered offers are declined too).
export async function competingBuyerIds(listingId: string, acceptedOfferId: string, acceptedBuyerId: string) {
  try {
    const { data } = await supabaseAdmin
      .from("offers")
      .select("buyer_id")
      .eq("listing_id", listingId)
      .neq("id", acceptedOfferId)
      .in("status", ["submitted", "countered"]);
    const ids = ((data ?? []) as { buyer_id: string }[]).map((r) => r.buyer_id);
    return Array.from(new Set(ids)).filter((id) => id !== acceptedBuyerId);
  } catch (e) {
    console.error("[email] competing offers lookup failed:", e);
    return [] as string[];
  }
}

// Call AFTER accept_offer succeeds.
export async function notifyAutoDeclined(buyerIds: string[], listingId: string) {
  if (buyerIds.length === 0) return;
  const info = await listingInfo(listingId);
  if (!info) return;
  for (const buyerId of buyerIds) {
    await emailUser({
      userId: buyerId,
      subject: `Update on your offer - ${info.title}`,
      heading: "The seller has accepted another offer",
      lines: [
        `The seller of ${info.title} has accepted a different offer, so your offer has been declined.`,
        "Thank you for your interest. You can keep browsing other homes on VendorHub.",
      ],
      buttonLabel: "Browse homes",
      path: "/buy",
      label: "offer.auto_declined",
    });
  }
}