import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import OffersList from "./OffersList";

export const metadata: Metadata = { title: "My offers — VendorHub" };
export const dynamic = "force-dynamic";

type OfferRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  amount: number;
  conditions: string[] | null;
  expires_at: string | null;
  settlement_date: string | null;
  status: string;
  counter_of: string | null;
  notes: string | null;
  created_at: string;
};

export default async function OffersPage() {
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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?next=/account/offers");

  const { data: buyerOffers } = await supabase
    .from("offers")
    .select("id, listing_id, buyer_id, amount, conditions, expires_at, settlement_date, status, counter_of, notes, created_at")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  const { data: sellerOffers } = await supabase
    .from("offers")
    .select("id, listing_id, buyer_id, amount, conditions, expires_at, settlement_date, status, counter_of, notes, created_at, listings!inner(member_id, headline, formatted_address, slug, region, suburb)")
    .eq("listings.member_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl py-10 px-4 space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-3">Offers on my listings</h2>
        <OffersList
          offers={(sellerOffers ?? []) as unknown as OfferRow[]}
          role="seller"
          userId={user.id}
        />
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-3">My offers</h2>
        <OffersList
          offers={(buyerOffers ?? []) as unknown as OfferRow[]}
          role="buyer"
          userId={user.id}
        />
      </div>
    </div>
  );
}
