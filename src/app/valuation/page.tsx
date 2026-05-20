import ValuationSearch from "@/components/valuation/ValuationSearch";

export const metadata = {
  title: "Property E-Valuation | VendorHub",
  description: "Get a free indicative property value estimate using public NZ data.",
};

export default function ValuationPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Property E-Valuation
          </h1>
          <p className="mt-2 text-sm text-muted max-w-md mx-auto">
            Enter an address to get a free indicative value range.
          </p>
        </div>

        <ValuationSearch />

        <p className="mt-12 text-center text-[10px] text-muted/60 max-w-sm mx-auto leading-relaxed">
          Data sourced from LINZ District Valuation Roll (CC-BY 4.0) and
          RBNZ Housing Statistics.
          Auckland City Council CV data.
        </p>
      </div>
    </main>
  );
}