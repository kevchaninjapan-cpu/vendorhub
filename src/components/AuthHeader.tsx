"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AuthHeader() {
  const pathname = usePathname();

  const linkClass = (href: string) =>
    `text-sm font-semibold transition-colors hover:text-indigo-400 ${
      pathname === href ? "text-indigo-400" : "text-gray-300"
    }`;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-gray-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Left: Brand */}
        <Link href="/" className="text-xl font-bold text-white tracking-tight">
          VendorHub
        </Link>

        {/* Right: Nav links */}
        <nav className="flex items-center gap-6">
          <Link href="/listings" className={linkClass("/listings")}>
            My Listings
          </Link>
          <Link href="/account" className={linkClass("/account")}>
            My Account
          </Link>
        </nav>
      </div>
    </header>
  );
}