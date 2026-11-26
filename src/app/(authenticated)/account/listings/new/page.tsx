import { ListingWizard } from "@/components/listings/wizard/ListingWizard";
import type { ListingDraft } from "@/types/marketplace";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Create listing \u2014 VendorHub" };

const PACKS = ["starter", "pro", "elite"] as const;

export default async function NewListingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const pack = PACKS.find((p) => p === plan);
  const initial = pack ? ({ pack_tier: pack } as ListingDraft) : undefined;

  return (
    <div className="mx-auto max-w-3xl py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Create a new listing</h1>
        <p className="text-sm text-muted-foreground">
          Five quick steps. We&apos;ll save your progress automatically as a draft.
        </p>
      </header>
      <ListingWizard initial={initial} />
    </div>
  );
}