import React from "react";
import Link from "next/link";

const LINKS = [
  { label: "Overview", href: "/account" },
  { label: "Verification", href: "/account/verify" },
  { label: "My listings", href: "/account/listings" },
  { label: "Buyer pipeline", href: "/account/pipeline" },
  { label: "Offers", href: "/account/offers" },
  { label: "Messages", href: "/account/messages" },
  { label: "Saved homes", href: "/account/saved" },
  { label: "E-valuation", href: "/account/valuation" },
];

const linkClass =
  "block rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900";

export default function AccountShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-12 gap-8">
          {/* Left rail */}
          <aside className="col-span-12 md:col-span-3">
            <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
              <div className="text-sm font-semibold text-gray-900">VendorHub</div>
              <div className="mt-1 text-xs text-gray-500">My account</div>
              <nav className="mt-6 space-y-1 text-sm">
                {LINKS.map((item) => (
                  <Link key={item.href} href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-6 border-t pt-4">
                <Link href="/" className="text-xs text-gray-500 hover:text-gray-700">
                  Back to the VendorHub home page
                </Link>
              </div>
            </div>
          </aside>

          {/* Main content. The signed-in layout already provides the main landmark. */}
          <div className="col-span-12 md:col-span-9 space-y-8">{children}</div>
        </div>
      </div>
    </div>
  );
}