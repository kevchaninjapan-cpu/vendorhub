// app/admin/layout.tsx
import Link from "next/link";
import "./admin.css"; // optional if you want to add scoped styles

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          display: "grid",
          gridTemplateColumns: "240px 1fr",
          minHeight: "100vh",
          background: "#f9fafb",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* Sidebar */}
        <aside
          style={{
            background: "#111827",
            color: "white",
            padding: "24px 16px",
            display: "grid",
            gap: "20px",
            height: "100%",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 20 }}>Admin</h2>

          <nav style={{ display: "grid", gap: 12 }}>
            <Link href="/admin" style={navLinkStyle}>
              Dashboard
            </Link>
            <Link href="/admin/users" style={navLinkStyle}>
              Users
            </Link>
            <Link href="/admin/properties" style={navLinkStyle}>
              Properties
            </Link>
            <Link href="/admin/settings" style={navLinkStyle}>
              Settings
            </Link>
          </nav>
        </aside>

        {/* Main content */}
        <main style={{ padding: "32px" }}>{children}</main>
      </body>
    </html>
  );
}

const navLinkStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 6,
  background: "rgba(255,255,255,0.1)",
  color: "white",
  textDecoration: "none",
};