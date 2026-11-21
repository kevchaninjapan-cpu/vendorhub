// app/(site)/layout.tsx
import Link from "next/link";
import { Button } from "../../components/ui/button";
import SiteFooter from "@/components/SiteFooter";

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
<header className="sticky top-0 z-50 bg-white">
  <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
    {/* Left: Brand */}
    <div className="text-sm font-semibold text-slate-900">
      VendorHub
    </div>

    {/* Centre nav */}
    <nav className="hidden md:flex items-center gap-8 text-sm text-slate-900">
      <a
        href="#features"
        className="hover:text-slate-900 transition"
      >
        Performance
      </a>
      <a
        href="#how-it-works"
        className="hover:text-slate-900 transition"
      >
        How it Works
      </a>
      <Link
        href="/pricing"
        className="hover:text-slate-900 transition"
      >
        Pricing
      </Link>
    </nav>

    {/* Right actions */}
    <div className="flex items-center gap-4">
      <Link
        href="/signin"
        className="text-sm text-slate-900 hover:text-slate-900 transition"
      >
        Sign in
      </Link>

      <Link
        href="/auth/sign-up"
        className="rounded-md border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
      >
        Create an Account
      </Link>
    </div>
  </div>

  {/* subtle divider */}
  <div className="h-px bg-slate-200/60" />
</header>

      {/* ===================== */}
      {/* PAGE CONTENT */}
      {/* ===================== */}
      {children}

      <SiteFooter />
    </div>
  );
}