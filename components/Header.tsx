// components/Header.tsx
import Link from "next/link";
import { Button } from "./ui";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-background/85 backdrop-blur border-b border-border/40">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 min-w-0">
            {/* Replace with your real logo component/image */}
            <div className="h-8 w-8 rounded-lg bg-surface border border-border/40" />
            <span className="truncate font-semibold tracking-tight text-foreground">
              Vendor<span className="text-primary">Hub</span>
            </span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted">
            <Link href="/#how" className="hover:text-foreground transition">
              How it works
            </Link>
            <Link href="/#pricing" className="hover:text-foreground transition">
              Pricing
            </Link>
            <Link href="/#addons" className="hover:text-foreground transition">
              Add-ons
            </Link>
            <Link href="/account" className="hover:text-foreground transition">
              FAQ
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link href="/signin" className="hidden sm:inline-flex">
              <Button variant="ghost">
                Sign in
              </Button>
            </Link>
            <Link href="/start" className="inline-flex">
              <Button>
                Start listing
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}