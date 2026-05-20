import "server-only";
import { requireAuth } from "@/lib/guards";
import AccountShell from "@/components/account/AccountShell";
import ValuationSearch from "@/components/valuation/ValuationSearch";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Property E-Valuation | VendorHub",
  description: "Get a free indicative property valuation powered by public data",
};

export default async function ValuationPage() {
  await requireAuth();

  return (
    <AccountShell>
      <div className="space-y-8">
        {/* ── Header ──────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Property E-Valuation
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Get a free indicative estimate powered by LINZ and Auckland Council
            public data.
          </p>
        </div>

        {/* ── Search + Results ────────────────────────────── */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <ValuationSearch />
        </div>

        {/* ── Disclaimer ──────────────────────────────────── */}
        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            About this estimate
          </h2>
          <p className="mt-2 text-xs text-gray-500 leading-relaxed">
            This is an indicative estimate only — not a registered valuation.
            It must not be relied upon for lending, insurance, or legal purposes.
            Data sourced from Land Information New Zealand (LINZ) under CC BY 4.0
            and Auckland Council public rating data. Rating valuations are
            conducted for council rating purposes and may differ from market
            sale prices.
          </p>
        </div>
      </div>
    </AccountShell>
  );
}