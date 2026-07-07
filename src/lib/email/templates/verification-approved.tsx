export default function VerificationApproved() {
  const url = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://vendorhub.co.nz") + "/buy";
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 560 }}>
      <h1 style={{ fontSize: 20, color: "#10b981" }}>You&apos;re verified &#10003;</h1>
      <p>Your identity has been verified. You can now make offers on any VendorHub listing.</p>
      <a href={url}
         style={{ background: "#10b981", color: "white", padding: "10px 16px",
                  textDecoration: "none", borderRadius: 6, display: "inline-block" }}>
        Browse listings
      </a>
    </div>
  );
}
