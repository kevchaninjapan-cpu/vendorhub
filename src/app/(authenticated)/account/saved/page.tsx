import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";
import AccountShell from "@/components/account/AccountShell";
import RemoveSavedButton from "@/components/listings/saved/RemoveSavedButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Saved homes | VendorHub", robots: { index: false, follow: false } };

type ListingRow = {
  id: string;
  slug: string | null;
  region: string | null;
  suburb: string | null;
  headline: string | null;
  formatted_address: string | null;
  display_address_masked: boolean | null;
  status: string;
  asking_price: number | null;
  price_text: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  ready_to_buy: boolean | null;
};

const LIVE = ["live", "under_offer"];
const toSlug = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "-");

function price(l: ListingRow): string {
  if (l.price_text) return l.price_text;
  if (l.asking_price) return "$" + Number(l.asking_price).toLocaleString("en-NZ");
  return "Price on enquiry";
}

export default async function SavedListingsPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin?redirect=%2Faccount%2Fsaved");

  const { data: savedRows } = await supabaseAdmin
    .from("saved_listings")
    .select("listing_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);
  const saved = (savedRows ?? []) as { listing_id: string; created_at: string }[];
  const ids = saved.map((s) => s.listing_id);

  const byId = new Map<string, ListingRow>();
  const covers = new Map<string, string>();
  if (ids.length > 0) {
    const { data: listingRows } = await supabaseAdmin
      .from("listings")
      .select(
        "id, slug, region, suburb, headline, formatted_address, display_address_masked, status, asking_price, price_text, bedrooms, bathrooms, ready_to_buy"
      )
      .in("id", ids);
    for (const l of (listingRows ?? []) as ListingRow[]) byId.set(l.id, l);

    const liveIds = ids.filter((id) => LIVE.includes(byId.get(id)?.status ?? ""));
    if (liveIds.length > 0) {
      const { data: media } = await supabaseAdmin
        .from("listing_media")
        .select("listing_id, public_url")
        .in("listing_id", liveIds)
        .eq("is_cover", true);
      for (const m of (media ?? []) as { listing_id: string; public_url: string | null }[]) {
        if (m.public_url) covers.set(m.listing_id, m.public_url);
      }
    }
  }

  return (
    <AccountShell>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-900">Saved homes</h1>
        <Link href="/buy" className="text-sm text-slate-600 underline">
          Browse homes
        </Link>
      </div>

      {saved.length === 0 ? (
        <section className="mt-4 rounded-2xl border border-border/40 bg-surface p-6 text-sm text-slate-600">
          <p>You haven&apos;t saved any homes yet.</p>
          <p className="mt-1">
            Tap <span className="font-medium">Save</span> on any listing to keep it here.{" "}
            <Link href="/buy" className="underline">Browse homes for sale</Link>.
          </p>
        </section>
      ) : (
        <ul className="mt-4 space-y-3">
          {saved.map((s) => {
            const l = byId.get(s.listing_id);
            const available = l && LIVE.includes(l.status);

            if (!l || !available) {
              return (
                <li
                  key={s.listing_id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700">No longer available</p>
                    <p className="text-xs text-slate-500">
                      This home has been sold or taken off the market.
                    </p>
                  </div>
                  <RemoveSavedButton listingId={s.listing_id} />
                </li>
              );
            }

            const masked = Boolean(l.display_address_masked);
            const title = masked
              ? [l.suburb, l.region].filter(Boolean).join(", ") || "Address on request"
              : l.headline ?? l.formatted_address ?? "Home for sale";
            const sub = masked ? "Address shown on enquiry" : l.headline ? l.formatted_address : null;
            const href =
              l.slug && l.region && l.suburb
                ? `/listings/${toSlug(l.region)}/${toSlug(l.suburb)}/${l.slug}`
                : "/buy";
            const cover = covers.get(l.id);

            return (
              <li
                key={s.listing_id}
                className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-3"
              >
                <Link href={href} className="block h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={href} className="block truncate text-sm font-semibold text-slate-900 hover:underline">
                        {title}
                      </Link>
                      {sub ? <p className="truncate text-xs text-slate-500">{sub}</p> : null}
                    </div>
                    <RemoveSavedButton listingId={l.id} />
                  </div>
                  <p className="mt-1 text-sm text-slate-800">{price(l)}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {l.bedrooms != null ? <span>{l.bedrooms} bed</span> : null}
                    {l.bathrooms != null ? <span>{l.bathrooms} bath</span> : null}
                    {l.status === "under_offer" ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">Under offer</span>
                    ) : null}
                    {l.ready_to_buy ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">Ready to buy</span>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AccountShell>
  );
}