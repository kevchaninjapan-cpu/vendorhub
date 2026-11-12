export default function EnquiryReply({
  listingTitle, senderLabel, message,
}: {
  listingTitle: string; senderLabel: string; message: string;
}) {
  const url = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://vendorhub.co.nz") + "/account/enquiries";
  const preview = message.length > 300 ? message.slice(0, 300) + "…" : message;
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 560 }}>
      <h1 style={{ fontSize: 20 }}>You have a new reply</h1>
      <p>{senderLabel} has replied about:</p>
      <blockquote style={{ borderLeft: "3px solid #10b981", paddingLeft: 12, margin: "12px 0" }}>
        {listingTitle}
      </blockquote>
      <p style={{ whiteSpace: "pre-wrap", background: "#f8fafc", padding: 12, borderRadius: 6 }}>
        {preview}
      </p>
      <p>Sign in to VendorHub to read the full conversation and reply.</p>
      <a href={url}
         style={{ background: "#10b981", color: "white", padding: "10px 16px",
                  textDecoration: "none", borderRadius: 6, display: "inline-block" }}>
        View conversation
      </a>
    </div>
  );
}
