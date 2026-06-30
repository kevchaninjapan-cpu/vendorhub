import Link from "next/link";
import type { SearchListing } from "@/types/marketplace-public";
import {
  priceLabel,
  summaryLine,
  area,
} from "@/lib/marketplace/format";

export default function ListingCard({ listing }: { listing: SearchListing }) {
  const href = `/listings/${listing.region?.toLowerCase()}/${listing.suburb
    ?.toLowerCase()
    .replace(/\s+/g, "-")}/${listing.slug}`;
  return (
    <Link
      href={href}
      className="group overflow-hidden rounded-md border bg-background transition hover:shadow"
    >
      <div className="aspect-[3/2] overflow-hidden bg-muted">
        {listing.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.cover_url}
            alt=""
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            No photo
          </div>
        )}
      </div>
      <div className="space-y-1 p-3">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="uppercase tracking-wide text-muted-foreground">
            {listing.pack_tier}
          </span>
          {listing.ready_to_buy && (
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800">
              Ready
            </span>
          )}
        </div>
        <p className="text-sm font-semibold">
          {priceLabel({
            method: listing.method_of_sale,
            askingPrice: listing.asking_price,
            priceText: listing.price_text,
            beoAmount: null,
            tenderCloseAt: null,
          })}
        </p>
        <p className="line-clamp-1 text-sm font-medium">
          {listing.formatted_address ?? listing.street_address}
        </p>
        <p className="text-xs text-muted-foreground">
          {summaryLine(listing.bedrooms, listing.bathrooms, listing.parking)}
          {listing.floor_area_sqm
            ? ` · ${area(listing.floor_area_sqm)} floor`
            : ""}
        </p>
      </div>
    </Link>
  );
}