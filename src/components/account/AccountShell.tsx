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
                  { label: "Profile", href: "#profile" },
                  { label: "Verification", href: "#verification" },
                  { label: "Documents", href: "#documents" },
                  { label: "My Listings", href: "#listings" },
                ].map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="block rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>

              <div className="mt-6 border-t pt-4 space-y-2">
                <Link
                  href="/seller-studio"
                  className="block text-xs text-gray-500 hover:text-gray-700"
                >
                  ← Back to Seller Studio
                </Link>
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="col-span-12 md:col-span-9 space-y-6">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">My Account</h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage your profile, verification status, documents and listings.
              </p>
            </div>
            {children}
          </main>

        </div>
      </div>
    </div>
  );
}