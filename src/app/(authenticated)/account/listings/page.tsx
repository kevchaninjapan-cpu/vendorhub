import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

type Listing = {
  id: string;
  short_id: string;
  status:
    | "draft"
    | "pending_review"
    | "live"
    | "under_offer"
    | "sold"
    | "withdrawn"
    | "rejected";
  pack_tier: "starter" | "pro" | "elite";
  formatted_address: string | null;
  headline: string | null;
  asking_price: number | null;
  ready_to_buy: boolean;
  published_at: string | null;
  rejected_reason: string | null;
  updated_at: string;
};

export const metadata: Metadata = { title: "My listings — VendorHub" };

async function getData(): Promise<Listing[]> {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data } = await supabase
    .from("listings")
    .select(
      "id, short_id, status, pack_tier, formatted_address, headline, " +
        "asking_price, ready_to_buy, published_at, rejected_reason, updated_at"
    )
    .eq("member_id", user.id)
    .order("updated_at", { ascending: false })
    .returns<Listing[]>();

  return data ?? [];
}

export default async function MyListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const params = await searchParams;
  const listings = await getData();

  return (
    <div className="mx-auto max-w-5xl py-10">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My listings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your drafts, live listings, and offers.
          </p>
        </div>
        <Link
          href="/account/listings/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          + New listing
        </Link>
      </header>

      {params.submitted && (
        <div className="mb-4 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
          ✓ Listing submitted for review. We&apos;ll usually approve within one
          business day.
        </div>
      )}

      {listings.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <Th>Property</Th>
                <Th>Tier</Th>
                <Th>Status</Th>
                <Th>Price</Th>
                <Th>Updated</Th>
                <Th> </Th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => (
                <tr key={l.id} className="border-t">
                  <Td>
                    <div className="font-medium">
                      {l.headline ?? l.formatted_address ?? "(untitled draft)"}
                    </div>
                    {l.formatted_address && l.headline && (
                      <div className="text-xs text-muted-foreground">
                        {l.formatted_address}
                      </div>
                    )}
                    {l.ready_to_buy && (
                      <span className="mt-1 inline-block rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                        Ready to Buy
                      </span>
                    )}
                  </Td>
                  <Td>
                    <TierBadge tier={l.pack_tier} />
                  </Td>
                  <Td>
                    <StatusBadge status={l.status} />
                    {l.status === "rejected" && l.rejected_reason && (
                      <div className="mt-1 text-xs text-red-600">
                        {l.rejected_reason}
                      </div>
                    )}
                  </Td>
                  <Td>
                    {l.asking_price
                      ? `NZ$ ${l.asking_price.toLocaleString()}`
                      : "—"}
                  </Td>
                  <Td className="text-xs text-muted-foreground">
                    {new Date(l.updated_at).toLocaleDateString("en-NZ")}
                  </Td>
                  <Td>
                    <Link
                      href={
                        ["draft", "rejected"].includes(l.status)
                          ? `/account/listings/${l.id}/edit`
                          : `/listings/${l.short_id}`
                      }
                      className="text-sm underline"
                    >
                      {["draft", "rejected"].includes(l.status) ? "Edit" : "View"}
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide">
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-3 py-3 align-top ${className}`}>{children}</td>;
}

function StatusBadge({ status }: { status: Listing["status"] }) {
  const map: Record<Listing["status"], string> = {
    draft: "bg-slate-100 text-slate-800",
    pending_review: "bg-amber-100 text-amber-800",
    live: "bg-emerald-100 text-emerald-800",
    under_offer: "bg-blue-100 text-blue-800",
    sold: "bg-purple-100 text-purple-800",
    withdrawn: "bg-zinc-100 text-zinc-700",
    rejected: "bg-red-100 text-red-800",
  };
  const label = status.replace("_", " ");
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs capitalize ${map[status]}`}
    >
      {label}
    </span>
  );
}

function TierBadge({ tier }: { tier: Listing["pack_tier"] }) {
  const styles: Record<Listing["pack_tier"], string> = {
    starter: "bg-slate-100 text-slate-700",
    pro: "bg-indigo-100 text-indigo-800",
    elite: "bg-amber-100 text-amber-800",
  };
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs uppercase tracking-wide ${styles[tier]}`}
    >
      {tier}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-md border bg-muted/30 p-10 text-center">
      <h2 className="text-lg font-semibold">No listings yet</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Create your first listing in five quick steps.
      </p>
      <Link
        href="/account/listings/new"
        className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Create listing
      </Link>
    </div>
  );
}