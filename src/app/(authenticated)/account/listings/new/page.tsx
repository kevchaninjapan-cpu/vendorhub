import { ListingWizard } from "@/components/listings/wizard/ListingWizard";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Create listing — VendorHub" };

export default function NewListingPage() {
  return (
    <div className="mx-auto max-w-3xl py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Create a new listing</h1>
        <p className="text-sm text-muted-foreground">
          Five quick steps. We&apos;ll save your progress automatically as a draft.
        </p>
      </header>
      <ListingWizard />
    </div>
  );
}