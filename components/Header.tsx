
import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-white border-b">
      <nav className="max-w-6xl mx-auto flex items-center justify-between p-4">
        <Link href="/" className="text-xl font-semibold">
          VendorHub
        </Link>

        <div className="space-x-6">
          <Link href="/pricing">Pricing</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/auth">Sign in</Link>
        </div>
      </nav>
    </header>
  );
}
