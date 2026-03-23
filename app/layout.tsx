// app/(site)/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css"; // keep if you colocate global styles here; otherwise remove

export const metadata: Metadata = {
  title: "VendorHub",
  description: "Sell your home privately with confidence.",
};

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-white text-slate-900">
        {/* Top nav for public pages */}
        <header className="border-b">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-semibold">
              VendorHub
            </Link>

            <nav className="flex items-center gap-6 text-sm text-slate-600">
              <Link href="/pricing" className="hover:text-slate-900">
                Pricing
              </Link>
              <Link href="/faq" className="hover:text-slate-900">
                FAQ
              </Link>
            <Link
  href="/auth/sign-in"
  className="border-0 outline-none ring-0 focus:outline-none focus:ring-0"
>
  Sign in
</Link>
            </nav>
          </div>
        </header>

        {/* Main content */}
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>

        {/* Footer */}
        <footer className="border-t">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 text-sm text-slate-600">
            <span>© {new Date().getFullYear()} VendorHub</span>
            <div className="flex items-center gap-4">
              <Link href="/legal/terms" className="hover:text-slate-900">
                Terms
              </Link>
              <Link href="/legal/privacy" className="hover:text-slate-900">
                Privacy
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}