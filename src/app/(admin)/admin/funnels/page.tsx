import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStaff } from "@/lib/ops/staff";

export const dynamic = "force-dynamic";
export const metadata = { title: "Funnels | VendorHub admin", robots: { index: false, follow: false } };

type Week = {
  week: string; signups: number; drafts: number; submitted: number; live: number;
  id_submitted: number; verified: number; enquiries: number; viewings: number;
  offers: number; accepted: number; estimates: number; searches: number;
};
type Data = {
  weeks: Week[];
  seller: Record<string, number>;
  buyer: Record<string, number>;
  timing: { median_hours_submit_to_live: number | null; listings_measured: number };
};

const weekLabel = (w: string) =>
  new Date(w + "T00:00:00Z").toLocaleDateString("en-NZ", { timeZone: "UTC", day: "numeric", month: "short" });

function Funnel({ title, rows }: { title: string; rows: { label: string; n: number }[] }) {
  const top = Math.max(1, rows[0]?.n ?? 1);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.label}>
            <div className="flex justify-between text-slate-700">
              <span>{r.label}</span>
              <span className="font-medium text-slate-900">
                {r.n} <span className="text-xs text-slate-400">({Math.round((r.n / top) * 100)}%)</span>
              </span>
            </div>
            <div className="mt-1 h-2 rounded bg-slate-100">
              <div className="h-2 rounded bg-indigo-500" style={{ width: `${Math.round((r.n / top) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const COLS: { key: keyof Week; label: string }[] = [
  { key: "signups", label: "Sign-ups" },
  { key: "drafts", label: "Drafts" },
  { key: "submitted", label: "Submitted" },
  { key: "live", label: "Went live" },
  { key: "id_submitted", label: "ID sent" },
  { key: "verified", label: "Verified" },
  { key: "enquiries", label: "Enquiries" },
  { key: "viewings", label: "Viewings" },
  { key: "offers", label: "Offers" },
  { key: "accepted", label: "Accepted" },
  { key: "estimates", label: "Estimates" },
  { key: "searches", label: "Searches" },
];

export default async function FunnelsPage() {
  const staff = await getStaff();
  if (!staff) redirect("/");

  const { data, error } = await supabaseAdmin.rpc("ops_funnels");
  if (error || !data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-rose-700">
        Couldn&apos;t load funnels. Has the insights SQL been run?
      </div>
    );
  }
  const d = data as Data;
  const s = d.seller;
  const b = d.buyer;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Funnels</h1>
        <p className="text-sm text-slate-500">
          Last 90 days, by week (Monday start, NZ time). Funnels follow people who signed up in that period.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Funnel
          title="Sellers"
          rows={[
            { label: "Signed up", n: s.signed_up ?? 0 },
            { label: "Created a draft", n: s.created_draft ?? 0 },
            { label: "Submitted for review", n: s.submitted ?? 0 },
            { label: "Went live", n: s.went_live ?? 0 },
            { label: "Received an offer", n: s.received_offer ?? 0 },
            { label: "Accepted an offer", n: s.accepted ?? 0 },
          ]}
        />
        <Funnel
          title="Buyers"
          rows={[
            { label: "Signed up", n: b.signed_up ?? 0 },
            { label: "Submitted ID", n: b.submitted_id ?? 0 },
            { label: "Verified", n: b.verified ?? 0 },
            { label: "Enquired or booked a viewing", n: b.engaged ?? 0 },
            { label: "Made an offer", n: b.offered ?? 0 },
          ]}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
        Median time from submitted to live:{" "}
        <span className="font-semibold text-slate-900">
          {d.timing.median_hours_submit_to_live != null ? `${d.timing.median_hours_submit_to_live} hours` : "not enough data"}
        </span>
        {d.timing.listings_measured ? ` (${d.timing.listings_measured} listings)` : ""}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Week of</th>
              {COLS.map((c) => (
                <th key={c.key} className="px-3 py-2 text-right">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[...d.weeks].reverse().map((w) => (
              <tr key={w.week}>
                <td className="px-3 py-2 text-slate-700">{weekLabel(w.week)}</td>
                {COLS.map((c) => (
                  <td key={c.key} className="px-3 py-2 text-right text-slate-900">{w[c.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">
        Estimates and searches are counted from the day this was installed. Estimates include requests over the daily limit.
      </p>
    </div>
  );
}