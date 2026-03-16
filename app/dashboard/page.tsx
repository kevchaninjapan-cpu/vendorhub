import { supabaseServer } from "@/lib/supabaseServer";
import Link from "next/link";

export default async function Dashboard() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main style={{ padding: 32 }}>
        <p>Not authenticated.</p>
        <Link href="/auth/sign-in">Go to sign-in</Link>
      </main>
    );
  }

  return (
    <main style={{ padding: 32, display: "grid", gap: 12 }}>
      <h2>Dashboard</h2>
      <p>Signed in as {user.email}</p>

      <form action="/api/auth/sign-out" method="post">
        <button type="submit">Sign out</button>
      </form>
    </main>
  );
}