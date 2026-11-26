import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import supabaseServer from "@/lib/supabaseServer";
import { getUnreadMessageCount } from "@/lib/messages/queries";
import AccountShell from "@/components/account/AccountShell";
import SignOutButton from "@/components/account/SignOutButton";

export const dynamic = "force-dynamic";

// Server-only lookups. Untyped client because some tables (conversations)
// aren't in the generated Supabase types.
function adminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function countWhere(table: string, column: string, value: string): Promise<number> {
  const { count } = await adminDb().from(table).select("id", { count: "exact", head: true }).eq(column, value);
  return count ?? 0;
}

const nzDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "long", year: "numeric" }) : "\u2014";

export default async function MyAccountPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) redirect("/signin");

  const db = adminDb();

  const [{ data: profileRow }, { data: verRow }, listings, offers, saved, convRes, unread] = await Promise.all([
    db.from("profiles").select("id, email, full_name, role, created_at").eq("id", user.id).maybeSingle(),
    db
      .from("verifications")
      .select("status, decided_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    countWhere("listings", "member_id", user.id),
    countWhere("offers", "buyer_id", user.id),
    countWhere("saved_listings", "user_id", user.id),
    db
      .from("listing_conversations")
      .select("id", { count: "exact", head: true })
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`),
    getUnreadMessageCount(),
  ]);

  const profile = profileRow as {
    email: string | null;
    full_name: string | null;
    role: string | null;
    created_at: string | null;
  } | null;
  const verification = verRow as { status: string; decided_at: string | null; created_at: string } | null;
  const conversations = convRes.count ?? 0;

  const isNew = listings === 0 && offers === 0 && saved === 0 && conversations === 0;
  const verStatus = verification?.status ?? "none";
  const firstName = profile?.full_name?.trim().split(/\s+/)[0];

  return (
    <AccountShell>
      {isNew ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="text-base font-semibold text-slate-900">
            Welcome to VendorHub{firstName ? `, ${firstName}` : ""}
          </h2>
          <p className="mt-1 text-sm text-slate-700">Here&apos;s how to get started. Pick whichever fits you.</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Selling a home</h3>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
                <li>
                  <Link href="/account/listings" className="underline">Create your listing</Link>. It saves as a draft as you go.
                </li>
                <li>Upload a LIM and record of title to earn the Ready to buy badge.</li>
                <li>Submit it for review. We check it before it goes live.</li>
              </ol>
            </div>
            <div className="rounded-xl bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Buying a home</h3>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
                <li>
                  <Link href="/buy" className="underline">Browse homes for sale</Link> and save the ones you like.
                </li>
                <li>
                  <Link href="/account/verify" className="underline">Verify your identity</Link> to make offers and download documents.
                </li>
                <li>
                  Curious what a home is worth? <Link href="/valuation" className="underline">Get a free estimate</Link>.
                </li>
              </ol>
            </div>
          </div>
        </section>
      ) : null}

      <section className={`${isNew ? "mt-4 " : ""}rounded-2xl border border-border/40 bg-surface p-5`}>
        <h2 className="text-sm font-semibold">Profile</h2>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <Field label="Name" value={profile?.full_name ?? "\u2014"} />
          <Field label="Email" value={profile?.email ?? user.email ?? "\u2014"} />
          <Field label="Role" value={profile?.role ?? "member"} />
          <Field label="Joined" value={nzDate(profile?.created_at)} />
        </div>
      </section>

      {verStatus === "approved" ? (
        <section className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="text-sm font-semibold text-emerald-900">Identity verified</h2>
          <p className="mt-1 text-xs text-emerald-800">
            Verified on {nzDate(verification?.decided_at)}. You can make offers and download property documents.
          </p>
        </section>
      ) : verStatus === "pending" ? (
        <section className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-5">
          <h2 className="text-sm font-semibold text-sky-900">Identity check under review</h2>
          <p className="mt-1 text-xs text-sky-800">
            Submitted on {nzDate(verification?.created_at)}. We usually review within one business day and will email you.
          </p>
        </section>
      ) : (
        <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-amber-900">
                {verStatus === "rejected" ? "We couldn't verify your identity" : "Verify your identity"}
              </h2>
              <p className="mt-1 text-xs text-amber-800">
                {verStatus === "rejected"
                  ? "Your last check wasn't approved. You can submit new documents at any time."
                  : "Upload your ID and proof of address to make offers and download property documents. It takes a few minutes."}
              </p>
            </div>
            <Link
              href="/account/verify"
              className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
            >
              {verStatus === "rejected" ? "Try again" : "Verify now"} &rarr;
            </Link>
          </div>
        </section>
      )}

      <section className="mt-4 rounded-2xl border border-border/40 bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">My listings</h2>
            <p className="mt-1 text-xs text-muted">
              {listings === 0 ? "You haven't created a listing yet." : "Manage your drafts, live listings, and offers."}
            </p>
          </div>
          <Link
            href="/account/listings"
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            {listings === 0 ? "Create a listing" : "Open dashboard"} &rarr;
          </Link>
        </div>
      </section>

      {listings > 0 ? (
        <section className="mt-4 rounded-2xl border border-border/40 bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Buyer pipeline</h2>
              <p className="mt-1 text-xs text-muted">
                Every buyer who has enquired, booked a viewing or made an offer on your listings.
              </p>
            </div>
            <Link href="/account/pipeline" className="rounded-md border px-3 py-1.5 text-xs font-semibold">
              Open pipeline &rarr;
            </Link>
          </div>
        </section>
      ) : null}
      <section className="mt-4 rounded-2xl border border-border/40 bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              Messages
              {unread > 0 && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                  {unread} new
                </span>
              )}
            </h2>
            <p className="mt-1 text-xs text-muted">
              Conversations with buyers and sellers, including enquiries and viewing requests.
            </p>
          </div>
          <Link href="/account/messages" className="rounded-md border px-3 py-1.5 text-xs font-semibold">
            View messages &rarr;
          </Link>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-border/40 bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Saved homes</h2>
            <p className="mt-1 text-xs text-muted">
              {saved === 0 ? "Homes you save will appear here." : `${saved} saved home${saved === 1 ? "" : "s"}.`}
            </p>
          </div>
          <Link href="/account/saved" className="rounded-md border px-3 py-1.5 text-xs font-semibold">
            View saved &rarr;
          </Link>
        </div>
      </section>
      <div className="mt-6">
        <SignOutButton />
      </div>
    </AccountShell>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}