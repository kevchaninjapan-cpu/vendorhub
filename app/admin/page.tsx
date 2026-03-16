// app/admin/page.tsx
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";

export default async function AdminPage() {
  // Create the server-side Supabase client (SSR cookie adapter)
  const supabase = await supabaseServer();

  // 1) Require authentication
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    // Optionally preserve return path with a query param
    redirect(`/auth/sign-in?redirect=/admin`);
  }

  // 2) Check admin flag in profiles table
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("is_admin, email")
    .eq("id", user!.id)
    .single();

  if (profileErr || !profile?.is_admin) {
    // You can redirect or render an access denied message
    return (
      <main style={{ padding: 32 }}>
        <h1 style={{ margin: 0 }}>Access denied</h1>
        <p style={{ marginTop: 8, color: "#666" }}>
          Your account does not have admin permissions.
        </p>
      </main>
    );
  }

  // 3) Render admin content
  return (
    <main style={{ padding: 32, display: "grid", gap: 16 }}>
      <header>
        <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
        <p style={{ marginTop: 6, color: "#666" }}>
          Signed in as <strong>{profile.email ?? user!.email}</strong>
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}
      >
        <article
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            background: "#fff",
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Quick links</h2>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
            <li>/admin/users</li>
            <li>/admin/properties</li>
            <li>/admin/settings</li>
          </ul>
        </article>

        <article
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            background: "#fff",
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 18 }}>System status</h2>
          <p style={{ marginTop: 8, color: "#666" }}>All systems nominal.</p>
        </article>
      </section>
    </main>
  );
}