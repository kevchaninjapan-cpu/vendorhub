import Link from "next/link";
import type { SearchListing } from "@/types/marketplace-public";
import { priceLabel, summaryLine, area } from "@/lib/marketplace/format";

type Props = {
  listing: SearchListing;
};

export default function ListingCard(props: Props) {
  const l = props.listing;

  const regionSlug = (l.region || "").toLowerCase();
  const suburbSlug = (l.suburb || "").toLowerCase().replace(/\s+/g, "-");
  const href = "/listings/" + regionSlug + "/" + suburbSlug + "/" + l.slug;

  const cardClasses = [
    "group block overflow-hidden rounded-lg border-2 border-transparent",
    "bg-white shadow-sm transition",
    "hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-md",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
  ].join(" ");

  const price = priceLabel({
    method: l.method_of_sale,
    askingPrice: l.asking_price,
    priceText: l.price_text,
    beoAmount: null,
    tenderCloseAt: null,
  });

  const summary = summaryLine(l.bedrooms, l.bathrooms, l.parking);
  const floorText = l.floor_area_sqm ? " . " + area(l.floor_area_sqm) + " floor" : "";
  const addressText = l.formatted_address || l.street_address || "";

  return (
    <Link href={href} className={cardClasses}>
      <div className="relative aspect-[3/2] overflow-hidden bg-slate-100">
        {l.cover_url ? (
          <img src={l.cover_url} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl text-slate-300">
            &#127969;
          </div>
        )}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {l.pack_tier !== "starter" ? (
            <span className="rounded bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-900 shadow-sm">
              {l.pack_tier}
            </span>
          ) : null}
          {l.ready_to_buy ? (
            <span className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
              Ready
            </span>
          ) : null}
        </div>
      </div>
      <div className="space-y-1 p-3">
        <p className="text-base font-bold text-slate-900">{price}</p>
        <p className="line-clamp-1 text-sm font-medium text-slate-800">
          {addressText}
        </p>
        <p className="text-xs text-slate-500">
          {summary}
          {floorText}
        </p>
        <div className="pt-1 text-[11px] font-semibold text-emerald-700 opacity-0 transition-opacity group-hover:opacity-100">
          View listing
        </div>
      </div>
    </Link>
  );
}
