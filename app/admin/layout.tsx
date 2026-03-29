// app/admin/layout.tsx
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createServerClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // ✅ Auth gate (server-side)
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error("[ADMIN_LAYOUT_AUTH_ERROR]", error);
    redirect("/login");
  }

  const user = data?.user;
  if (!user) redirect("/login");
  if (!isAdminUser(user)) redirect("/");

  // ✅ Original layout UI (nav + sidebar + content)
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <nav className="flex items-center gap-6 text-sm mb-6 border-b pb-3">
          <Link href="/dashboard" className="hover:underline">
            Overview
          </Link>
          <Link href="/listings" className="hover:underline">
            My listings
          </Link>
          <Link href="/admin" className="hover:underline font-medium">
            Admin home
          </Link>
          <Link href="/admin/listings" className="hover:underline">
            All listings
          </Link>
          <Link href="/admin/users" className="hover:underline">
            Users
          </Link>
        </nav>

        <div className="grid grid-cols-12 gap-6">
          <aside className="col-span-3 space-y-2">
            <div className="text-xs uppercase text-slate-500">Admin</div>
            <ul className="space-y-1">
              <li>
                <Link href="/admin" className="hover:underline">
                  Admin home
                </Link>
              </li>
              <li>
                <Link href="/admin/listings" className="hover:underline">
                  All listings
                </Link>
              </li>
              <li>
                <Link href="/admin/users" className="hover:underline">
                  Users
                </Link>
              </li>
            </ul>
          </aside>

          <main className="col-span-9">{children}</main>
        </div>
      </div>
    </div>
  );
}
