export default function ViewingBooked({
  listingTitle,
  when,
  buyerName,
  buyerPhone,
  kind,
  manageUrl,
}: {
  listingTitle: string;
  when: string;
  buyerName: string;
  buyerPhone: string;
  kind: "open_home" | "private";
  manageUrl: string;
}) {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 560 }}>
      <h1 style={{ fontSize: 20 }}>
        {kind === "private" ? "New private viewing booked" : "New open home booking"}
      </h1>
      <p>
        <strong>{buyerName}</strong> has booked to view:
      </p>
      <blockquote style={{ borderLeft: "3px solid #10b981", paddingLeft: 12, margin: "12px 0" }}>
        {listingTitle}
      </blockquote>
      <p>
        <strong>When:</strong> {when}
      </p>
      <p>
        <strong>Phone:</strong> {buyerPhone}
      </p>
      <a
        href={manageUrl}
        style={{
          background: "#10b981",
          color: "white",
          padding: "10px 16px",
          textDecoration: "none",
          borderRadius: 6,
          display: "inline-block",
        }}
      >
        See all bookings
      </a>
    </div>
  );
}