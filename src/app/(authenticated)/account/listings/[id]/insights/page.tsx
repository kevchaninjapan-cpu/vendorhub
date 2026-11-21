import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { DOCUMENT_TYPE_LABELS, type DocumentType } from "@/lib/documents/schema";
import { formatNzDate, formatNzTime } from "@/lib/viewings/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Insights | VendorHub", robots: { index: false, follow: false } };

type Pair = { now: number; prev: number };
type Insights = {
  tier_full: boolean;
  cards: { views: Pair; visitors: Pair; saves: Pair; enquiries: Pair; viewings: Pair; offers: Pair };
  weeks: { week: string; views: number; visitors: number; enquiries: number; offers: number }[];
  documents: { id: string; doc_type: string; label: string; visibility: string; downloads: number }[];
  viewings: {
    upcoming: number;
    open_requests: number;
    past_sessions: { starts_at: string; kind: string; booked: number; attended: number }[];
  };
  response: { median_minutes: number | null; replied: number; waiting_over_24h: number };
  health: {
    status: string;
    pack_tier: string;
    days_on_market: number | null;
    photos: number;
    ready_to_buy: boolean;
    has_lim: boolean;
    has_title: boolean;
    weathertightness: boolean;
    sessions_upcoming: number;
    accepts_requests: boolean;
  };
  funnel: { visitors: number; saved: number; enquired: number; booked: number; downloaded: number; offered: number } | null;
  sources: Record<string, number> | null;
  compare: { peers: number; yours: number | null; median: number | null } | null;
};

type Props = { params: Promise<{ id: string }> };

const weekLabel = (w: string) =>
  w ? new Date(w + "T00:00:00Z").toLocaleDateString("en-NZ", { timeZone: "UTC", day: "numeric", month: "short" }) : "";

function duration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = minutes / 60;
  if (h < 48) return `${Math.round(h)} hour${Math.round(h) === 1 ? "" : "s"}`;
  return `${Math.round(h / 24)} days`;
}

function Card({ title, pair, note }: { title: string; pair: Pair; note?: string }) {
  const diff = pair.now - pair.prev;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{pair.now}</p>
      <p className={diff > 0 ? "text-xs text-emerald-700" : diff < 0 ? "text-xs text-rose-600" : "text-xs text-slate-500"}>
        {diff === 0 ? "Same as" : `${diff > 0 ? "+" : ""}${diff} vs`} the previous 7 days
      </p>
      {note ? <p className="mt-1 text-[11px] text-slate-400">{note}</p> : null}
    </div>
  );
}

function Section({ title, children, sub }: { title: string; children: React.ReactNode; sub?: string }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {sub ? <p className="mt-0.5 text-xs text-slate-500">{sub}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function ListingInsightsPage({ params }: Props) {
  const { id } = await params;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/signin?redirect=${encodeURIComponent(`/account/listings/${id}/insights`)}`);

  const { data: listing } = await supabase
    .from("listings")
    .select("id, headline, formatted_address")
    .eq("id", id)
    .maybeSingle<{ id: string; headline: string | null; formatted_address: string | null }>();
  if (!listing) notFound();

  const { data: raw, error } = await supabase.rpc("seller_listing_insights", { p_listing_id: id });
  if (error) {
    if (/NOT_LISTING_OWNER|LISTING_NOT_FOUND/.test(error.message)) notFound();
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-rose-700">
        Couldn&apos;t load insights right now. Please try again shortly.
      </div>
    );
  }
  const d = raw as Insights;
  const h = d.health;
  const title = listing.headline ?? listing.formatted_address ?? "Your listing";
  const base = `/account/listings/${id}`;

  // Next steps, most useful first.
  const steps: { text: string; href: string }[] = [];
  if (d.response.waiting_over_24h > 0)
    steps.push({
      text: `Reply to ${d.response.waiting_over_24h} buyer${d.response.waiting_over_24h === 1 ? "" : "s"} waiting over 24 hours`,
      href: "/account/messages",
    });
  if (h.photos < 5) steps.push({ text: `Add more photos (you have ${h.photos}; listings do best with 5 or more)`, href: `${base}/edit` });
  if (!h.has_lim) steps.push({ text: "Upload a LIM that buyers can see", href: `${base}/documents` });
  if (!h.has_title) steps.push({ text: "Upload a record of title that buyers can see", href: `${base}/documents` });
  if (!h.weathertightness) steps.push({ text: "Tick Weathertightness disclosed in the Disclosures step", href: `${base}/edit` });
  if (h.sessions_upcoming === 0 && (h.status === "live" || h.status === "under_offer"))
    steps.push({ text: "Add an open home or private viewing times", href: `${base}/viewings` });

  const maxViews = Math.max(1, ...d.weeks.map((w) => w.views));
  const funnelRows = d.funnel
    ? [
        { label: "Visitors", n: d.funnel.visitors },
        { label: "Saved the listing", n: d.funnel.saved },
        { label: "Sent an enquiry", n: d.funnel.enquired },
        { label: "Booked a viewing", n: d.funnel.booked },
        { label: "Downloaded documents", n: d.funnel.downloaded },
        { label: "Made an offer", n: d.funnel.offered },
      ]
    : [];
  const funnelMax = Math.max(1, ...funnelRows.map((f) => f.n));
  const sourceTotal = d.sources ? Object.values(d.sources).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href="/account/listings" className="text-slate-500 hover:text-slate-800">
          &larr; Back to my listings
        </Link>
        <span className="flex gap-4">
          <Link href={`${base}/documents`} className="text-slate-500 hover:text-slate-800">Documents</Link>
          <Link href={`${base}/viewings`} className="text-slate-500 hover:text-slate-800">Viewings</Link>
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Insights</h1>
        <p className="mt-1 text-sm text-slate-500">
          {title}
          {h.days_on_market != null ? ` \u00b7 ${h.days_on_market} days on market` : ""}
        </p>
        <p className="mt-1 text-xs text-slate-400">Last 90 days, by week. Weeks start on Monday, New Zealand time.</p>
      </div>

      {steps.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-base font-semibold text-slate-900">Next steps</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {steps.map((s) => (
              <li key={s.text}>
                <Link href={s.href} className="text-amber-900 underline">{s.text}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card title="Views" pair={d.cards.views} />
        <Card title="Visitors" pair={d.cards.visitors} note="Each visitor counted once a day" />
        <Card title="Saves" pair={d.cards.saves} />
        <Card title="Enquiries" pair={d.cards.enquiries} />
        <Card title="Viewings booked" pair={d.cards.viewings} />
        <Card title="Offers" pair={d.cards.offers} />
      </section>

      <Section title="Views by week">
        <div className="flex h-40 items-end gap-1">
          {d.weeks.map((w) => (
            <div key={w.week} className="flex h-full flex-1 flex-col items-center justify-end">
              <span className="text-[10px] text-slate-500">{w.views || ""}</span>
              <div
                className="w-full rounded-t bg-emerald-500"
                style={{ height: `${Math.round((w.views / maxViews) * 85)}%`, minHeight: w.views ? 2 : 0 }}
                title={`Week of ${weekLabel(w.week)}: ${w.views} views, ${w.visitors} visitors`}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-slate-400">
          <span>{weekLabel(d.weeks[0]?.week ?? "")}</span>
          <span>This week</span>
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Documents" sub="Buyers who downloaded each document. Names are never shown.">
          {d.documents.length === 0 ? (
            <p className="text-sm text-slate-500">
              No documents yet. <Link href={`${base}/documents`} className="underline">Upload a LIM and record of title</Link>.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {d.documents.map((doc) => (
                <li key={doc.id} className="flex justify-between gap-3 py-2">
                  <span className="truncate text-slate-700">
                    {DOCUMENT_TYPE_LABELS[doc.doc_type as DocumentType] ?? doc.doc_type}
                    {doc.visibility === "private" ? " (only you)" : ""}
                  </span>
                  <span className="shrink-0 font-medium text-slate-900">{doc.downloads}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Viewings">
          <div className="flex gap-6 text-sm">
            <p><span className="text-2xl font-semibold text-slate-900">{d.viewings.upcoming}</span> upcoming</p>
            <p><span className="text-2xl font-semibold text-slate-900">{d.viewings.open_requests}</span> open requests</p>
          </div>
          {d.viewings.past_sessions.length > 0 ? (
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {d.viewings.past_sessions.slice(0, 6).map((s) => (
                <li key={s.starts_at} className="flex justify-between gap-3 py-2">
                  <span className="text-slate-700">
                    {s.kind === "private" ? "Private viewings" : "Open home"}, {formatNzDate(s.starts_at)} {formatNzTime(s.starts_at)}
                  </span>
                  <span className="shrink-0 text-slate-900">
                    {s.booked} booked{s.attended ? `, ${s.attended} attended` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-slate-500">No past open homes in the last 90 days.</p>
          )}
        </Section>

        <Section title="Your response time" sub="How quickly you reply to buyer messages.">
          {d.response.median_minutes != null ? (
            <p className="text-sm text-slate-700">
              You usually reply within <span className="font-semibold text-slate-900">{duration(d.response.median_minutes)}</span>
              {" "}(based on {d.response.replied} conversation{d.response.replied === 1 ? "" : "s"}).
            </p>
          ) : (
            <p className="text-sm text-slate-500">No replies to measure yet.</p>
          )}
          {d.response.waiting_over_24h > 0 ? (
            <p className="mt-2 text-sm text-rose-700">
              {d.response.waiting_over_24h} buyer{d.response.waiting_over_24h === 1 ? " is" : "s are"} waiting over 24 hours.{" "}
              <Link href="/account/messages" className="underline">Reply now</Link>
            </p>
          ) : null}
        </Section>

        <Section title="Listing health">
          <ul className="space-y-1 text-sm text-slate-700">
            <li>Photos: <span className="font-medium text-slate-900">{h.photos}</span></li>
            <li>Ready to buy badge: <span className="font-medium text-slate-900">{h.ready_to_buy ? "Yes" : "Not yet"}</span></li>
            <li>Upcoming open homes or viewing times: <span className="font-medium text-slate-900">{h.sessions_upcoming}</span></li>
            <li>Viewing requests: <span className="font-medium text-slate-900">{h.accepts_requests ? "On" : "Off"}</span></li>
          </ul>
        </Section>
      </div>

      {d.tier_full ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Buyer interest" sub="People at each stage over the last 90 days. Visitors are counted once a day.">
            <ul className="space-y-2 text-sm">
              {funnelRows.map((f) => (
                <li key={f.label}>
                  <div className="flex justify-between text-slate-700">
                    <span>{f.label}</span>
                    <span className="font-medium text-slate-900">{f.n}</span>
                  </div>
                  <div className="mt-1 h-2 rounded bg-slate-100">
                    <div className="h-2 rounded bg-emerald-500" style={{ width: `${Math.round((f.n / funnelMax) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <div className="space-y-6">
            <Section title="Where views come from">
              {sourceTotal === 0 ? (
                <p className="text-sm text-slate-500">No views yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {Object.entries(d.sources ?? {})
                    .sort((a, b) => b[1] - a[1])
                    .map(([k, v]) => (
                      <li key={k} className="flex justify-between py-1.5">
                        <span className="text-slate-700">{k}</span>
                        <span className="text-slate-900">{Math.round((v / sourceTotal) * 100)}%</span>
                      </li>
                    ))}
                </ul>
              )}
            </Section>

            <Section title="Compared with similar homes">
              {d.compare && d.compare.median != null ? (
                <p className="text-sm text-slate-700">
                  Your listing had <span className="font-semibold text-slate-900">{d.compare.yours}</span> views in the last
                  7 days. A typical live listing in your suburb had{" "}
                  <span className="font-semibold text-slate-900">{Math.round(d.compare.median)}</span> (middle value of{" "}
                  {d.compare.peers} listings).
                </p>
              ) : (
                <p className="text-sm text-slate-500">
                  This appears once there are at least 5 other live listings in your suburb
                  {d.compare ? ` (currently ${d.compare.peers})` : ""}.
                </p>
              )}
            </Section>
          </div>
        </div>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
          <h2 className="text-base font-semibold text-slate-900">More insights with Pro and Elite</h2>
          <p className="mt-1">
            See where buyers drop off between viewing and making an offer, where your views come from, and how your
            listing compares with similar homes in your suburb.
          </p>
        </section>
      )}
    </div>
  );
}