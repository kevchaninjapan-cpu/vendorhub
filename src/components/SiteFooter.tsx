import Link from "next/link";

// Shared site footer. The LINZ credit is required by the CC BY 4.0 licence
// for the suburb boundary data.
export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-32 border-t border-slate-200/60">
      <div className="mx-auto max-w-7xl px-6 py-12 text-sm text-slate-900">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>&copy; {year} VendorHub. All rights reserved.</div>
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
        <p className="mt-6 text-xs text-slate-500">
          Suburb boundaries &copy; Toit&#363; Te Whenua Land Information New Zealand, licensed under CC BY 4.0.
        </p>
      </div>
    </footer>
  );
}