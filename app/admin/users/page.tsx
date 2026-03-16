
// app/admin/users/page.tsx
import { supabaseServer } from "@/lib/supabaseServer";

export default async function UsersPage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div>
      <h1 style={{ marginBottom: 16 }}>Users</h1>
      <p>Welcome {user?.email}. This page will list all users in the system.</p>

      <div
        style={{
          marginTop: 24,
          padding: 16,
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          background: "white",
        }}
      >
        <p>User management goes here…</p>
      </div>
    </div>
  );
}
