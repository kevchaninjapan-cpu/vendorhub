// app/admin/waitlist/page.tsx
// Server component: DO NOT add "use client"

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { redirect } from "next/navigation";

// (Optional) strong typing for rows
type WaitlistRow = {
  id: string;
  email: string;
  created_at: string;
};

export default async function AdminWaitlistPage() {
  /**
   * 🚧 Soft "gate" using an environment variable.
   * This is NOT production-grade auth — it just prevents casual access
   * until you wire proper authentication/roles.
   *
   * 1) Add ADMIN_SECRET to your .env.local:
   *    ADMIN_SECRET=YOUR_PASSWORD_HERE
   * 2) For Vercel, add the same variable in:
   *    Project → Settings → Environment Variables
   * 3) Restart dev server (locally) or redeploy (Vercel) after changing env vars.
   */
  if (process.env.ADMIN_SECRET !== "YOUR_PASSWORD_HERE") {
    // If the value doesn't match what you set locally/in Vercel, redirect home.
    return redirect("/");
  }

  // Create a server-side Supabase client (service role)
  const supa = supabaseAdmin();

  // Fetch newest-first
  const { data, error } = await supa
    .from("waitlist")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[AdminWaitlist] Load error:", error);
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold">Admin: Waitlist</h1>
        <p className="mt-4 text-red-600">Failed to load waitlist. Check server logs.</p>
      </div>
    );
  }

  const rows = (data ?? []) as WaitlistRow[];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold">Admin: Waitlist</h1>
      <p className="mt-2 text-gray-600">
        Read-only view of waitlist signups. (Authentication/role gating to be added later.)
      </p>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed p-10 text-center text-gray-600">
          No waitlist signups yet.
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-left">
            <thead className="bg-gray-50 text-sm text-gray-700">
              <tr>
                <th className="p-3 border-b">Email</th>
                <th className="p-3 border-b">Signed Up</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {rows.map((entry) => (
                <tr key={entry.id} className="odd:bg-white even:bg-gray-50">
                  <td className="p-3 border-b">{entry.email}</td>
                  <td className="p-3 border-b">
                    {new Date(entry.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}