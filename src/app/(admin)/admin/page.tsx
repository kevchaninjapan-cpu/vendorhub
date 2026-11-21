import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStaff } from "@/lib/ops/staff";
import { formatNzDate, formatNzTime } from "@/lib/viewings/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard | VendorHub admin", robots: { index: false, follow: false } };

type Stats = {
  listings_by_status: Record<string, number>;
  users_total: number;
  users_new_7d: number;
  verifications_pending: number;
  offers_active: number;
  offers_7d_by_status: Record<string, number>;
  viewings_upcoming: number;
  requests_open: number;
  unanswered_total: number;
  unanswered: { conversation_id: string; listing_title: string; waiting_since: string }[];
};

const LISTING_ORDER = ["pending_review", "live", "under_offer", "draft", "sold", "withdrawn", "rejected"];
const label = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

function Card({ title, value, sub, href, highlight }: { title: string; value: number; sub?: string; href?: string; highlight?: boolean }) {
  const body = (
    <div className={highlight ? "rounded-2xl border border-amber-300 bg-amber-50 p-5" : "rounded-2xl border border-slate-200 bg-white p-5"}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
  return href ? <Link href={href} className="block hover:opacity-90">{body}</Link> : body;
}

export default async function AdminDashboard() {
  const staff = await getStaff();
  if (!staff) redirect("/");

  const { data, error } = await supabaseAdmin.rpc("ops_dashboard_stats");
  if (error || !data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-rose-700">
        Couldn&apos;t load the dashboard. Has the ops console SQL been run?
      </div>
    );
  }
  const st = data as Stats;
  const lb = st.listings_by_status ?? {};
  const pending = lb.pending_review ?? 0;
  const offers7d = Object.entries(st.offers_7d_by_status ?? {});

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Signed in as {staff.role}.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Pending review" value={pending} sub="Listings waiting for moderation" href="/moderation/queue" highlight={pending > 0} />
        <Card title="Verifications" value={st.verifications_pending ?? 0} sub="Waiting for review" href="/verifications/queue" highlight={(st.verifications_pending ?? 0) > 0} />
        <Card title="Users" value={st.users_total ?? 0} sub={`${st.users_new_7d ?? 0} new this week`} />
        <Card title="Active offers" value={st.offers_active ?? 0} sub="Submitted or countered" />
        <Card title="Upcoming viewings" value={st.viewings_upcoming ?? 0} />
        <Card title="Open viewing requests" value={st.requests_open ?? 0} />
        <Card title="Unanswered messages" value={st.unanswered_total ?? 0} sub="Buyer waiting over 24 hours" highlight={(st.unanswered_total ?? 0) > 0} />
        <Card title="Live listings" value={(lb.live ?? 0) + (lb.under_offer ?? 0)} sub="Live or under offer" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Listings by status</h2>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {LISTING_ORDER.filter((k) => lb[k] != null).map((k) => (
              <li key={k} className="flex justify-between py-2">
                <span className="text-slate-600">{label(k)}</span>
                <span className="font-medium text-slate-900">{lb[k]}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Offers this week</h2>
          {offers7d.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No offers in the last 7 days.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {offers7d.map(([k, v]) => (
                <li key={k} className="flex justify-between py-2">
                  <span className="text-slate-600">{label(k)}</span>
                  <span className="font-medium text-slate-900">{v}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Buyers waiting for a reply</h2>
        <p className="text-xs text-slate-500">Oldest first. Sellers may need a nudge.</p>
        {(st.unanswered ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">None. Every buyer message has a reply within 24 hours.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {st.unanswered.map((u) => (
              <li key={u.conversation_id} className="flex justify-between gap-4 py-2">
                <span className="truncate text-slate-700">{u.listing_title}</span>
                <span className="shrink-0 text-slate-500">
                  since {formatNzTime(u.waiting_since)}, {formatNzDate(u.waiting_since)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {staff.role === "admin" ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Exports</h2>
          <p className="text-xs text-slate-500">
            CSV files for Excel. Phone numbers, home addresses and dates of birth are left out. Every export is logged.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {["listings", "users", "offers", "viewings"].map((t) => (
              <a
                key={t}
                href={`/api/admin/export?type=${t}`}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {label(t)} CSV
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}