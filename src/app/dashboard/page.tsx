// app/dashboard/page.tsx
import { requireAuth } from "@/lib/guards"
// (Optionally) import getProfile if you gate admin content
// import { getProfile } from "@/lib/auth";

export default async function DashboardPage() {
  // If you use guards, keep them – but still return a visible shell after they pass.
await requireAuth()
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-slate-600">You’re signed in. Content will appear here.</p>
    </div>
  );
}