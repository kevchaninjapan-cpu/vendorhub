export default function OfferCountered({
  originalAmount,
  counterAmount,
  listingTitle,
  fromParty,
}: {
  originalAmount: number;
  counterAmount: number;
  listingTitle: string;
  fromParty: "buyer" | "seller";
}) {
  const url =
    (process.env.NEXT_PUBLIC_SITE_URL ?? "https://vendorhub.co.nz") +
    "/account/offers";

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 560 }}>
      <h1 style={{ fontSize: 20, color: "#d97706" }}>
        You have a counter-offer
      </h1>

      <p>
        The {fromParty} has countered at{" "}
        <strong>NZ${counterAmount.toLocaleString()}</strong> (was NZ$
        {originalAmount.toLocaleString()}) on:
      </p>

      <blockquote
        style={{
          borderLeft: "3px solid #d97706",
          paddingLeft: 12,
          margin: "12px 0",
        }}
      >
        {listingTitle}
      </blockquote>

      <p>Sign in to accept, decline, or counter again.</p>

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
        Review counter-offer
      </a>
    </div>
  );
}
