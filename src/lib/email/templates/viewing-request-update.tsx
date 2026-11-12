// One template for every viewing-request and message email. All text comes
// in as props, so wording can change without touching the markup.
export default function ViewingRequestUpdate({
  heading,
  lines,
  buttonLabel,
  url,
}: {
  heading: string;
  lines: string[];
  buttonLabel: string;
  url: string;
}) {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 560 }}>
      <h1 style={{ fontSize: 20 }}>{heading}</h1>
      {lines.map((line, i) => (
        <p key={i} style={{ whiteSpace: "pre-wrap" }}>
          {line}
        </p>
      ))}
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
        {buttonLabel}
      </a>
    </div>
  );
}