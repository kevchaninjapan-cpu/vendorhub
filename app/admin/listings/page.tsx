// app/admin/listings/page.tsx
import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { requireAdmin } from "@/lib/requireAdmin";
import { revalidatePath } from "next/cache";

//
// ✅ Status values MUST match Postgres enum listing_status
// enum: draft | active | under_offer | sold | withdrawn
//
export const STATUS = {
  draft: "draft",
  active: "active",
  under_offer: "under_offer",
  sold: "sold",
  withdrawn: "withdrawn",
} as const;

export type ListingStatus = (typeof STATUS)[keyof typeof STATUS];

type ListingRow = {
  id: string;
  owner_id: string | null;

  title: string | null;
  description: string | null;

  price_numeric: number | null;
  price_display: string | null;

  status: ListingStatus | null;
  property_type: string | null;

  bedrooms: number | null;
  bathrooms: number | null;
  car_spaces: number | null;

  address_line1: string | null;
  address_line2: string | null;
  suburb: string | null;
  city: string | null;
  region: string | null;
  postcode: string | null;

  slug: string | null;

  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

// ✅ keep literal to avoid Supabase GenericStringError typing
const LISTINGS_SELECT = `
  id,
  owner_id,
  title,
  description,
  price_numeric,
  price_display,
  status,
  property_type,
  bedrooms,
  bathrooms,
  car_spaces,
  address_line1,
  address_line2,
  suburb,
  city,
  region,
  postcode,
  slug,
  published_at,
  created_at,
  updated_at,
  deleted_at
` as const;

type StatusFilter = "all" | ListingStatus;
type ShowFilter = "active" | "archived" | "all";

function formatMoneyNZD(value: number | null) {
  if (value === null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-NZ", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function badgeClass(status: ListingStatus | null) {
  if (status === STATUS.active) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === STATUS.under_offer) return "bg-blue-50 text-blue-700 ring-blue-200";
  if (status === STATUS.sold) return "bg-slate-50 text-slate-700 ring-slate-200";
  if (status === STATUS.withdrawn) return "bg-zinc-50 text-zinc-700 ring-zinc-200";
  if (status === STATUS.draft) return "bg-amber-50 text-amber-800 ring-amber-200";
  return "bg-zinc-50 text-zinc-700 ring-zinc-200";
}

function compact(s: string | null | undefined) {
  return (s ?? "").trim();
}

function buildQueryString(params: Record<string, string | undefined>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") usp.set(k, v);
  });
  const s = usp.toString();
  return s ? `?${s}` : "";
}

function safeStatus(input: unknown): StatusFilter {
  const v = String(input ?? "").toLowerCase();
  if (
    v === STATUS.draft ||
    v === STATUS.active ||
    v === STATUS.under_offer ||
    v === STATUS.sold ||
    v === STATUS.withdrawn
  ) {
    return v as ListingStatus;
  }
  return "all";
}

function safeShow(input: unknown): ShowFilter {
  const v = String(input ?? "").toLowerCase();
  if (v === "active" || v === "archived" || v === "all") return v as ShowFilter;
  return "active";
}

// ✅ avoid replaceAll (older TS lib targets)
function escapeForILike(value: string) {
  return value.replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export const dynamic = "force-dynamic";

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();

  const sp = (await searchParams) ?? {};
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = safeStatus(typeof sp.status === "string" ? sp.status : undefined);
  const show = safeShow(typeof sp.show === "string" ? sp.show : undefined);

  // ------------------------------------------------------------
  // ✅ Server Actions
  // ------------------------------------------------------------
  async function getSupabaseAdminClient() {
    "use server";
    await requireAdmin();
    const cookieStore = await cookies();

    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );
  }

  async function publishListing(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;

    const supabase = await getSupabaseAdminClient();

    const { error } = await supabase
      .from("listings")
      .update({
        status: STATUS.active,
        published_at: new Date().toISOString(),
        deleted_at: null, // if accidentally archived, publish should bring back
      })
      .eq("id", id);

    if (error) throw new Error(error.message);
    revalidatePath("/admin/listings");
  }

  async function unpublishListing(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;

    const supabase = await getSupabaseAdminClient();

    const { error } = await supabase
      .from("listings")
      .update({
        status: STATUS.draft,
        published_at: null,
      })
      .eq("id", id);

    if (error) throw new Error(error.message);
    revalidatePath("/admin/listings");
  }

  async function archiveListing(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;

    const supabase = await getSupabaseAdminClient();

    // ✅ Archive = soft delete via deleted_at
    // Optional: also set status to withdrawn IF it was active/under_offer (valid enum)
    const { data: row, error: fetchErr } = await supabase
      .from("listings")
      .select("status")
      .eq("id", id)
      .single();

    if (fetchErr) throw new Error(fetchErr.message);

    const currentStatus = (row?.status ?? null) as ListingStatus | null;

    const updatePayload: Record<string, any> = {
      deleted_at: new Date().toISOString(),
    };

    if (currentStatus === STATUS.active || currentStatus === STATUS.under_offer) {
      updatePayload.status = STATUS.withdrawn;
      updatePayload.published_at = null;
    }

    const { error } = await supabase.from("listings").update(updatePayload).eq("id", id);

    if (error) throw new Error(error.message);
    revalidatePath("/admin/listings");
  }

  async function restoreListing(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;

    const supabase = await getSupabaseAdminClient();

    // ✅ Restore = undelete and reset to draft (safe)
    const { error } = await supabase
      .from("listings")
      .update({
        deleted_at: null,
        status: STATUS.draft,
        published_at: null,
      })
      .eq("id", id);

    if (error) throw new Error(error.message);
    revalidatePath("/admin/listings");
  }

  // ------------------------------------------------------------
  // ✅ Data Fetch (filters + search)
  // ------------------------------------------------------------
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

  let query = supabase.from("listings").select(LISTINGS_SELECT);

  // show filter: active (not deleted), archived (deleted), or all
  if (show === "active") query = query.is("deleted_at", null);
  if (show === "archived") query = query.not("deleted_at", "is", null);

  // status filter
  if (status !== "all") query = query.eq("status", status);

  // search (title/suburb/city)
  if (q) {
    const escaped = escapeForILike(q);
    query = query.or(`title.ilike.%${escaped}%,suburb.ilike.%${escaped}%,city.ilike.%${escaped}%`);
  }

  const { data, error } = await query.order("updated_at", { ascending: false }).limit(200);
  const listings: ListingRow[] = (data ?? []) as ListingRow[];

  // ------------------------------------------------------------
  // ✅ UI
  // ------------------------------------------------------------
  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All statuses" },
    { key: STATUS.draft, label: "Draft" },
    { key: STATUS.active, label: "Active" },
    { key: STATUS.under_offer, label: "Under offer" },
    { key: STATUS.sold, label: "Sold" },
    { key: STATUS.withdrawn, label: "Withdrawn" },
  ];

  const showTabs: { key: ShowFilter; label: string }[] = [
    { key: "active", label: "Active" },
    { key: "archived", label: "Archived" },
    { key: "all", label: "All" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin • Listings</h1>
          <p className="text-sm text-muted-foreground">
            Filter, search, publish, and archive listings (server-side + RLS-safe).
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/admin/listings/new"
            className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-black/90"
          >
            + New listing
          </Link>

          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            View site
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        {/* Show (archived via deleted_at) */}
        <div className="flex flex-wrap gap-2">
          {showTabs.map((t) => {
            const href = "/admin/listings" + buildQueryString({ show: t.key, status: String(status), q });
            const active = show === t.key;
            return (
              <Link
                key={t.key}
                href={href}
                className={[
                  "rounded-xl border px-3 py-1.5 text-sm font-medium",
                  active ? "bg-black text-white border-black" : "hover:bg-muted",
                ].join(" ")}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        {/* Status tabs */}
        <div className="flex flex-wrap gap-2">
          {statusTabs.map((t) => {
            const href = "/admin/listings" + buildQueryString({ show, status: String(t.key), q });
            const active = status === t.key;
            return (
              <Link
                key={t.key}
                href={href}
                className={[
                  "rounded-xl border px-3 py-1.5 text-sm font-medium",
                  active ? "bg-black text-white border-black" : "hover:bg-muted",
                ].join(" ")}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        {/* Search */}
        <form className="flex flex-col gap-2 sm:flex-row sm:items-center" method="get">
          <input type="hidden" name="show" value={show} />
          <input type="hidden" name="status" value={String(status)} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search title, suburb, or city…"
            className="w-full sm:w-[420px] rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90"
            >
              Search
            </button>

            <Link
              href={"/admin/listings" + buildQueryString({ show, status: String(status) })}
              className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Clear
            </Link>
          </div>
        </form>
      </div>

      {/* Error */}
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="font-medium">Couldn’t load listings</div>
          <div className="mt-1 opacity-90">{error.message ?? "Unknown error"}</div>
        </div>
      ) : null}

      {/* Empty */}
      {!error && listings.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8">
          <h2 className="text-lg font-medium">No results</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Try another status, switch Active/Archived/All, or broaden your search.
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              href="/admin/listings/new"
              className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-black/90"
            >
              + Create listing
            </Link>

            <Link
              href="/admin/listings"
              className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Reset filters
            </Link>
          </div>
        </div>
      ) : null}

      {/* Table */}
      {!error && listings.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Listing</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Type / Beds</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Updated</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {listings.map((l) => {
                  const address = [compact(l.address_line1), compact(l.suburb), compact(l.city), compact(l.region)]
                    .filter(Boolean)
                    .join(", ");

                  const typeBeds = [
                    l.property_type ? l.property_type.toLowerCase() : null,
                    l.bedrooms !== null ? `${l.bedrooms} bd` : null,
                    l.bathrooms !== null ? `${l.bathrooms} ba` : null,
                    l.car_spaces !== null ? `${l.car_spaces} car` : null,
                  ]
                    .filter(Boolean)
                    .join(" • ");

                  const priceText =
                    (l.price_display && l.price_display.trim()) ||
                    (l.price_numeric !== null ? formatMoneyNZD(l.price_numeric) : "—");

                  // ✅ support both: slug first, id fallback
                  const publicHref = l.slug ? `/listings/${l.slug}` : `/listings/${l.id}`;

                  const isArchived = !!l.deleted_at;

                  // ✅ Treat active + under_offer as "published-ish" for public viewing
                  const isPublished =
                    !isArchived &&
                    (l.status === STATUS.active || l.status === STATUS.under_offer) &&
                    !!l.published_at;

                  return (
                    <tr key={l.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{l.title ?? "Untitled"}</div>
                        <div className="text-xs text-muted-foreground">{address || "—"}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {l.slug ? `Slug: ${l.slug}` : `ID: ${l.id}`}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${badgeClass(
                            l.status
                          )}`}
                        >
                          {(l.status ?? "unknown").toLowerCase()}
                        </span>

                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {l.published_at ? `Published ${formatDate(l.published_at)}` : "Not published"}
                          {isArchived ? " • Archived" : ""}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-sm">{typeBeds || "—"}</td>

                      <td className="px-4 py-3 text-sm">{priceText}</td>

                      <td className="px-4 py-3 text-sm">{formatDate(l.updated_at ?? l.created_at)}</td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link
                            href={`/admin/listings/${l.id}`}
                            className="rounded-xl border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                          >
                            Edit
                          </Link>

                          <Link
                            href={publicHref}
                            className="rounded-xl border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                          >
                            View
                          </Link>

                          {!isArchived ? (
                            <>
                              {/* Publish / Unpublish */}
                              {isPublished ? (
                                <form action={unpublishListing}>
                                  <input type="hidden" name="id" value={l.id} />
                                  <button
                                    type="submit"
                                    className="rounded-xl border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                                  >
                                    Unpublish
                                  </button>
                                </form>
                              ) : (
                                <form action={publishListing}>
                                  <input type="hidden" name="id" value={l.id} />
                                  <button
                                    type="submit"
                                    className="rounded-xl bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-black/90"
                                  >
                                    Publish
                                  </button>
                                </form>
                              )}

                              {/* Archive (soft delete via deleted_at) */}
                              <form action={archiveListing}>
                                <input type="hidden" name="id" value={l.id} />
                                <button
                                  type="submit"
                                  className="rounded-xl border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                                >
                                  Archive
                                </button>
                              </form>
                            </>
                          ) : (
                            /* Restore */
                            <form action={restoreListing}>
                              <input type="hidden" name="id" value={l.id} />
                              <button
                                type="submit"
                                className="rounded-xl border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                              >
                                Restore
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t bg-muted/10 px-4 py-3 text-xs text-muted-foreground">
            <div>
              {listings.length} listing(s)
              {q ? ` • Search: “${q}”` : ""}
              {status !== "all" ? ` • Status: ${status}` : ""}
              {show !== "active" ? ` • Show: ${show}` : ""}
            </div>
            <div>Newest first • Limit 200</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
