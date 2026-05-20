// app/dashboard/layout.tsx
import "server-only";
import type { ReactNode } from "react";
import Link from "next/link";
import { requireAuth } from "@/lib/guards";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAuth();

  return (
    <div className="min-h-[100svh] bg-slate-50 text-slate-900">
      {/* TOP NAV */}
      <header className="border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link
            href="/dashboard"
            className="text-base font-semibold text-slate-900 no-underline"
          >
            VendorHub
          </Link>

          <nav className="flex items-center gap-6 text-sm text-slate-700">
            <Link
              href="/dashboard"
              className="hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 rounded-md"
            >
              Overview
            </Link>

            <Link
              href="/dashboard/listings"
              className="hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 rounded-md"
            >
              My listings
            </Link>

            <Link
              href="/admin"
              className="hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 rounded-md"
            >
              Admin
            </Link>

            <Link
              href="/auth/sign-out"
              className="text-slate-700 hover:text-slate-900 no-underline border-0 ring-0 outline-none focus:outline-none focus:ring-0"
            >
              Sign out
            </Link>
          </nav>
        </div>
      </header>

      {/* DASHBOARD SHELL */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        {/* SIDEBAR (Desktop only) */}
        <aside className="hidden md:block">
          <div className="sticky top-[70px] space-y-4">
            <div className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-900">
              Navigation
            </div>

            <nav className="grid gap-1 text-sm text-slate-700">
              <Link
                href="/dashboard"
                className="rounded-md px-2 py-1 hover:bg-slate-100"
              >
                Overview
              </Link>

              <Link
                href="/dashboard/listings"
                className="rounded-md px-2 py-1 hover:bg-slate-100"
              >
                My listings
              </Link>

              {/* ── Tools ──────────────────────────────────── */}
              <div className="px-2 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-900">
                Tools
              </div>

              <Link
                href="/properties/valuation"
                className="rounded-md px-2 py-1 hover:bg-slate-100 flex items-center gap-2"
              >
                🏠 Property Valuation
              </Link>

              {/* ── Admin ──────────────────────────────────── */}
              <div className="px-2 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-900">
                Admin
              </div>

              <Link
                href="/admin"
                className="rounded-md px-2 py-1 hover:bg-slate-100"
              >
                Admin home
              </Link>

              <Link
                href="/admin/listings"
                className="rounded-md px-2 py-1 hover:bg-slate-100"
              >
                All listings
              </Link>

              <Link
                href="/admin/users"
                className="rounded-md px-2 py-1 hover:bg-slate-100"
              >
                Users
              </Link>
            </nav>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}