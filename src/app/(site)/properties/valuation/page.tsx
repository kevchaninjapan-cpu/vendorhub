import type { Metadata } from "next";
import { ValuationSearch } from "./valuation-search";

export const metadata: Metadata = {
  title: "Property Valuation | VendorHub",
  description: "Get a free indicative property valuation powered by public data",
};

export default function ValuationPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Property E-Valuation
        </h1>
        <p className="mt-2 text-slate-500">
          Get a free indicative estimate powered by LINZ public data
        </p>
      </div>

      <ValuationSearch />

      <p className="mt-10 text-center text-xs text-slate-400">
        This is an indicative estimate only — not a registered valuation.
        It must not be relied upon for lending, insurance, or legal purposes.
        Data sourced from LINZ under CC BY 4.0.
      </p>
    </main>
  );
}