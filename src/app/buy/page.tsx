import type { Metadata } from "next";
import { searchListings } from "@/lib/marketplace/queries";
import { searchParamsToFilters } from "@/lib/marketplace/url";
import SearchView from "./SearchView";

export const metadata: Metadata = {
  title: "Buy property — VendorHub",
  description: "Browse private-sale listings in New Zealand on VendorHub.",
};

export const revalidate = 60;

export default async function BuyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  Object.entries(sp).forEach(([k, v]) => {
    if (typeof v === "string") params.set(k, v);
  });
  const filters = searchParamsToFilters(params);
  const data = await searchListings(filters);

  return <SearchView initialFilters={filters} initialResults={data} />;
}