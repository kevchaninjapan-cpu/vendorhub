import OnboardingShell from "@/components/onboarding/OnboardingShell";
import Link from "next/link";

export default function SubmittedPage() {
  return (
    <OnboardingShell
      title="Verification Submitted"
      subtitle="Thanks, your documents have been securely submitted. Our compliance team is reviewing your information."
    >
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6">
        <div className="flex items-start gap-4">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700 text-lg">
            ⏳
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900">Account status: Temporary (Unverified)</div>
            <p className="mt-1 text-sm text-gray-600">
              You can access VendorHub in a limited capacity while verification is in progress.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/seller-studio"
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Continue to my account
              </Link>
              <Link
                href="/onboarding/review"
                className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                View submitted documents
              </Link>
            </div>
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}
