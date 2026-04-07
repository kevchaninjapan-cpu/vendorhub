// app/(site)/layout.tsx
import Link from "next/link";
import { Button } from "../../components/ui/button";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f9f9fb] text-slate-900">
      {/* ===================== */}
      {/* TOP NAV */}
      {/* ===================== */}
      <header className="relative z-10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Left */}
            <div className="flex items-center gap-10">
              <Link
                href="/"
                className="text-sm font-semibold tracking-tight"
              >
                VendorHub
              </Link>

              <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
                <Link
                  href="/solutions"
                  className="hover:text-slate-900 transition-colors"
                >
                  Solutions
                </Link>
                <Link
                  href="/pricing"
                  className="hover:text-slate-900 transition-colors"
                >
                  Pricing
                </Link>
                <Link
                  href="/resources"
                  className="hover:text-slate-900 transition-colors"
                >
                  Resources
                </Link>
              </nav>
            </div>

            {/* Right */}
            <div className="flex items-center gap-4">
              <Link
                href="/consult"
                className="hidden sm:inline-block text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                FAQ
              </Link>

              <Link href="/listings/create">
                <Button size="sm">Start listing</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ===================== */}
      {/* PAGE CONTENT */}
      {/* ===================== */}
      {children}

      {/* ===================== */}
      {/* FOOTER (quiet, optional) */}
      {/* ===================== */}
      <footer className="mt-32 border-t border-slate-200/60">
        <div className="mx-auto max-w-7xl px-6 py-12 text-sm text-slate-500">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>© {new Date().getFullYear()} VendorHub</div>

            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-slate-700">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-slate-700">
                Terms
              </Link>
              <Link href="/contact" className="hover:text-slate-700">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}