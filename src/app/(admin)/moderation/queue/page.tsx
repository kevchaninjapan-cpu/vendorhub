import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import Link from "next/link";
import type { Metadata } from "next";
import { approveListing, rejectListing } from "@/lib/moderation/actions";

type Row = {
  id: string;
  short_id: string;
  status: string;
  pack_tier: string;
  formatted_address: string | null;
  headline: string | null;
  description: string | null;
  asking_price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  floor_area_sqm: number | null;
  land_area_sqm: number | null;
  ready_to_buy: boolean;
  disclosures: Record<string, unknown> | null;
  member_id: string;
  created_at: string;
  updated_at: string;
};

type Media = {
  id: string;
  listing_id: string;
  public_url: string | null;
  is_cover: boolean;
};

export const metadata: Metadata = { title: "Moderation queue — VendorHub" };
export const dynamic = "force-dynamic";

async function getQueue() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: rows } = await supabase
    .from("listings")
    .select(
      "id, short_id, status, pack_tier, formatted_address, headline, " +
      "description, asking_price, bedrooms, bathrooms, parking, " +
      "floor_area_sqm, land_area_sqm, ready_to_buy, disclosures, " +
      "member_id, created_at, updated_at"
    )
    .eq("status", "pending_review")
    .order("created_at", { ascending: true })
    .returns<Row[]>();

  const safeRows: Row[] = rows ?? [];
  const ids = safeRows.map((r) => r.id);

  const { data: media } = ids.length
    ? await supabase
        .from("listing_media")
        .select("id, listing_id, public_url, is_cover")
        .in("listing_id", ids)
        .returns<Media[]>()
    : { data: [] as Media[] };

  const mediaByListing = new Map<string, Media[]>();
  (media ?? []).forEach((m) => {
    const list = mediaByListing.get(m.listing_id) ?? [];
    list.push(m);
    mediaByListing.set(m.listing_id, list);
  });

  return { rows: safeRows, mediaByListing };
}

export default async function ModerationQueuePage() {
  const { rows, mediaByListing } = await getQueue();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Moderation queue</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length === 0
            ? "Nothing waiting for review — nice work."
            : `${rows.length} listing${rows.length === 1 ? "" : "s"} awaiting review`}
        </p>
      </header>

      <div className="space-y-6">
        {rows.map((r) => {
          const media = mediaByListing.get(r.id) ?? [];
          const cover = media.find((m) => m.is_cover) ?? media[0];

          return (
            <article
              key={r.id}
              className="overflow-hidden rounded-md border bg-background"
            >
              <div className="grid gap-0 md:grid-cols-[260px_1fr]">
                <div className="aspect-square w-full overflow-hidden bg-muted">
                  {cover?.public_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover.public_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                      No cover photo
                    </div>
                  )}
                </div>

                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">
                        {r.headline ?? r.formatted_address ?? "(untitled)"}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {r.formatted_address}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs uppercase tracking-wide text-amber-800">
                        {r.pack_tier}
                      </span>
                      {r.ready_to_buy && (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                          Ready to Buy
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                    <Fact label="Beds" value={r.bedrooms ?? "—"} />
                    <Fact label="Baths" value={r.bathrooms ?? "—"} />
                    <Fact label="Parking" value={r.parking ?? "—"} />
                    <Fact label="Floor m²" value={r.floor_area_sqm ?? "—"} />
                    <Fact label="Land m²" value={r.land_area_sqm ?? "—"} />
                    <Fact
                      label="Asking"
                      value={
                        r.asking_price
                          ? `NZ$ ${r.asking_price.toLocaleString()}`
                          : "—"
                      }
                    />
                    <Fact label="Photos" value={media.length} />
                    <Fact
                      label="Submitted"
                      value={new Date(r.updated_at).toLocaleDateString("en-NZ")}
                    />
                  </div>

                  {r.description && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground">
                        Description
                      </summary>
                      <p className="mt-2 whitespace-pre-wrap">{r.description}</p>
                    </details>
                  )}

                  <DisclosuresSummary disclosures={r.disclosures} />

                  {media.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pt-2">
                      {media.map((m) =>
                        m.public_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={m.id}
                            src={m.public_url}
                            alt=""
                            className="h-16 w-16 flex-none rounded object-cover"
                          />
                        ) : null
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-3">
                    <ApproveForm id={r.id} />
                    <RejectForm id={r.id} />
                    <Link
                      href={`/listings/preview/${r.id}`}
                      className="ml-auto text-xs underline"
                    >
                      Open full preview ↗
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Fact({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded border bg-muted/30 px-2 py-1">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function DisclosuresSummary({
  disclosures,
}: {
  disclosures: Record<string, unknown> | null;
}) {
  const d = disclosures ?? {};
  const items: ReadonlyArray<[string, unknown]> = [
    ["LIM", d["lim_provided"]],
    ["Title", d["title_provided"]],
    ["Weathertightness disclosed", d["weathertightness_disclosed"]],
    ["Unconsented works", d["unconsented_works"]],
    ["Building report", d["building_report_provided"]],
  ];
  return (
    <ul className="grid grid-cols-2 gap-1 text-xs md:grid-cols-3">
      {items.map(([label, val]) => (
        <li key={label} className="flex items-center gap-1">
          <span className={val ? "text-emerald-700" : "text-muted-foreground"}>
            {val ? "✓" : "•"}
          </span>
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
}

// ---------- Inline server-action forms -----------------------------------
function ApproveForm({ id }: { id: string }) {
  async function action(formData: FormData) {
    "use server";
    const notes = (formData.get("notes") as string) || undefined;
    await approveListing(id, notes);
  }
  return (
    <form action={action} className="flex items-center gap-2">
      <input
        name="notes"
        placeholder="Notes (optional)"
        className="rounded border px-2 py-1 text-xs"
      />
      <button
        type="submit"
        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
      >
        Approve & publish
      </button>
    </form>
  );
}

function RejectForm({ id }: { id: string }) {
  async function action(formData: FormData) {
    "use server";
    const reason = (formData.get("reason") as string) || "";
    await rejectListing(id, reason);
  }
  return (
    <form action={action} className="flex items-center gap-2">
      <input
        name="reason"
        placeholder="Reason (required)"
        className="rounded border px-2 py-1 text-xs"
      />
      <button
        type="submit"
        className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
      >
        Reject
      </button>
    </form>
  );
}