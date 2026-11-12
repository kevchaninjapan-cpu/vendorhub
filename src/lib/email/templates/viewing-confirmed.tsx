export default function ViewingConfirmed({
  listingTitle,
  when,
  kind,
  url,
}: {
  listingTitle: string;
  when: string;
  kind: "open_home" | "private";
  url: string;
}) {
  const heading = kind === "private" ? "Your private viewing is booked" : "You're booked for the open home";
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 560 }}>
      <h1 style={{ fontSize: 20 }}>{heading}</h1>
      <blockquote style={{ borderLeft: "3px solid #10b981", paddingLeft: 12, margin: "12px 0" }}>
        {listingTitle}
      </blockquote>
      <p>
        <strong>When:</strong> {when}
      </p>
      <p>
        {
          "The seller has your name and phone number. If you can't make it, please cancel from the listing page so someone else can have the time."
        }
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