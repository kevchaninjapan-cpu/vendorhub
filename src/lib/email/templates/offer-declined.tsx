export default function OfferDeclined({
  amount,
  listingTitle,
  reason,
}: {
  amount: number;
  listingTitle: string;
  reason?: string;
}) {
  const url =
    (process.env.NEXT_PUBLIC_SITE_URL ?? "https://vendorhub.co.nz") +
    "/account/offers";

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 560 }}>
      <h1 style={{ fontSize: 20 }}>Your offer was declined</h1>

      <p>
        The seller has declined your offer of{" "}
        <strong>NZ${amount.toLocaleString()}</strong> on:
      </p>

      <blockquote
        style={{
          borderLeft: "3px solid #94a3b8",
          paddingLeft: 12,
          margin: "12px 0",
        }}
      >
        {listingTitle}
      </blockquote>

      {reason ? (
        <p style={{ fontStyle: "italic" }}>Reason given: {reason}</p>
      ) : null}

      <p>
        You&apos;re welcome to submit a revised offer if you&apos;d like to
        continue.
      </p>

      <a
        href={url}
        style={{
          background: "#10b981",
          color: "white",
          padding: "10px 16px",
          textDecoration: "none",
          borderRadius: 6,
          display: "inline-block",
        }}
      >
        View listing
      </a>
    </div>
  );
}
