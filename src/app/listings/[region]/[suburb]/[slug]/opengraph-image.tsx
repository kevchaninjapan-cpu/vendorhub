import { ImageResponse } from "next/og";
import { getListingBySlug } from "@/lib/marketplace/queries";
import { priceLabel, summaryLine } from "@/lib/marketplace/format";

export const runtime = "edge";
export const alt = "VendorHub listing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG({
  params,
}: {
  params: { region: string; suburb: string; slug: string };
}) {
  const listing = await getListingBySlug(params.slug);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 60,
          backgroundColor: "#0b0f17",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 28, opacity: 0.85 }}>VendorHub</div>
        <div>
          <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1 }}>
            {listing?.headline ?? listing?.formatted_address ?? "Property listing"}
          </div>
          <div style={{ marginTop: 16, fontSize: 32 }}>
            {listing
              ? priceLabel({
                  method: listing.method_of_sale,
                  askingPrice: listing.asking_price,
                  priceText: listing.price_text,
                  beoAmount: listing.beo_amount,
                  tenderCloseAt: listing.tender_close_at,
                })
              : "View on VendorHub"}
          </div>
          <div style={{ marginTop: 12, fontSize: 26, opacity: 0.85 }}>
            {listing
              ? summaryLine(
                  listing.bedrooms,
                  listing.bathrooms,
                  listing.parking
                )
              : ""}
          </div>
        </div>
        <div style={{ fontSize: 22, opacity: 0.7 }}>
          {listing?.suburb} · {listing?.region}
        </div>
      </div>
    ),
    { ...size }
  );
}