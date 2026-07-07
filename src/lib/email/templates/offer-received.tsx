export default function OfferReceived({
  amount, listingTitle, buyerName,
}: {
  amount: number; listingTitle: string; buyerName: string;
}) {
  const url = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://vendorhub.co.nz") + "/account/offers";
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 560 }}>
      <h1 style={{ fontSize: 20 }}>You have a new offer</h1>
      <p>A verified buyer has submitted an offer of <strong>NZ${amount.toLocaleString()}</strong> on:</p>
      <blockquote style={{ borderLeft: "3px solid #10b981", paddingLeft: 12, margin: "12px 0" }}>
        {listingTitle}
      </blockquote>
      <p>Sign in to VendorHub to review or respond to {buyerName}&apos;s offer.</p>
      <a href={url}
         style={{ background: "#10b981", color: "white", padding: "10px 16px",
                  textDecoration: "none", borderRadius: 6, display: "inline-block" }}>
        View offer
      </a>
    </div>
  );
}
