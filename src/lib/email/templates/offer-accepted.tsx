export default function OfferAccepted({
  amount, listingTitle,
}: {
  amount: number; listingTitle: string;
}) {
  const url = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://vendorhub.co.nz") + "/account/offers";
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 560 }}>
      <h1 style={{ fontSize: 20, color: "#10b981" }}>Your offer was accepted</h1>
      <p>Great news — the seller has accepted your offer of <strong>NZ${amount.toLocaleString()}</strong> on:</p>
      <blockquote style={{ borderLeft: "3px solid #10b981", paddingLeft: 12, margin: "12px 0" }}>
        {listingTitle}
      </blockquote>
      <p>Next steps: connect with the seller via VendorHub messaging to arrange contract exchange.</p>
      <a href={url}
         style={{ background: "#10b981", color: "white", padding: "10px 16px",
                  textDecoration: "none", borderRadius: 6, display: "inline-block" }}>
        Open VendorHub
      </a>
    </div>
  );
}
