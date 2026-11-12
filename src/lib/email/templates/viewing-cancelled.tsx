export default function ViewingCancelled({
  listingTitle,
  when,
  cancelledBy,
  url,
}: {
  listingTitle: string;
  when: string;
  cancelledBy: "buyer" | "seller";
  url: string;
}) {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 560 }}>
      <h1 style={{ fontSize: 20 }}>
        {cancelledBy === "seller" ? "Your viewing has been cancelled" : "A buyer has cancelled their viewing"}
      </h1>
      <blockquote style={{ borderLeft: "3px solid #94a3b8", paddingLeft: 12, margin: "12px 0" }}>
        {listingTitle}
      </blockquote>
      <p>
        <strong>When:</strong> {when}
      </p>
      <p>
        {cancelledBy === "seller"
          ? "The seller has cancelled this time. You can book another time from the listing page."
          : "That time is now free for other buyers."}
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
        {cancelledBy === "seller" ? "View listing" : "See all bookings"}
      </a>
    </div>
  );
}