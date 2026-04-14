import OnboardingShell from "@/components/onboarding/OnboardingShell";
import Link from "next/link";

export default function SuccessPage() {
  return (
    <OnboardingShell
      title="Account Created"
      subtitle="Your VendorHub account has been created. To unlock all features, you’ll need to complete identity verification."
    >
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6">
        <div className="flex items-start gap-4">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-700 text-lg">
            ✓
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900">Account status: Unverified</div>
            <p className="mt-1 text-sm text-gray-600">
              Verification is required before listings can go live or VendorHub packages can be processed.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/onboarding/identity"
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Upload verification documents
              </Link>
              <Link
                href="/seller-studio"
                className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                Skip for now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}