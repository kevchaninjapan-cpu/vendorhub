// src/app/listings/create/page.tsx
import CreateListingWizard from "@/app/(authenticated)/listings/create/CreateListingWizard";

export const dynamic = "force-dynamic";

export default function CreateListingPage() {
  return <CreateListingWizard />;
}
