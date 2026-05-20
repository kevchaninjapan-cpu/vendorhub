import React from "react";
import Link from "next/link";

export default function AccountShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-12 gap-8">

          {/* Left rail */}
          <aside className="col-span-12 md:col-span-3">
            <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
              <div className="text-sm font-semibold text-gray-900">VendorHub</div>
              <div className="mt-1 text-xs text-gray-500">My Account</div>

              <nav className="mt-6 space-y-1 text-sm">
                {[
                  { label: "Profile", href: "/account#profile" },
                  { label: "Verification", href: "/account#verification" },
                  { label: "Documents", href: "/account#documents" },
                ].map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="block rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  >
                    {item.label}
                  </Link>
                ))}

                {/* ✅ NEW — E-Valuation link */}
                <Link
                  href="/account/valuation"
                  className="block rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                >
                  E-Valuation
                </Link>

                <Link
                  href="/account#listings"
                  className="block rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                >
                  My Listings
                </Link>

                {/* ✅ Home link to main landing page */}
                <Link
                  href="/"
                  className="block rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                >
                  🏠 Home
                </Link>
              </nav>

              <div className="mt-6 border-t pt-4 space-y-2">
                <Link
                  href="/seller-studio"
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  ← Back to Seller Hub
                </Link>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="col-span-12 md:col-span-9 space-y-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}