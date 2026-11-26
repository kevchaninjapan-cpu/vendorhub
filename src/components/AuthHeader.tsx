"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AuthHeader({ unreadMessages = 0 }: { unreadMessages?: number }) {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const linkClass = (href: string) =>
    `text-sm font-semibold transition-colors hover:text-indigo-400 ${
      isActive(href) ? "text-indigo-400" : "text-gray-300"
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
          <Link href="/account/listings" className={linkClass("/account/listings")}>
            My Listings
          </Link>
          <Link href="/account/messages" className={`${linkClass("/account/messages")} flex items-center gap-1.5`}>
            Messages
            {unreadMessages > 0 ? (
              <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {unreadMessages > 99 ? "99+" : unreadMessages}
              </span>
            ) : null}
          </Link>
          <Link href="/account" className={pathname === "/account" ? "text-sm font-semibold text-indigo-400 transition-colors hover:text-indigo-400" : "text-sm font-semibold text-gray-300 transition-colors hover:text-indigo-400"}>
            My Account
          </Link>
        </nav>
      </div>
    </header>
  );
}