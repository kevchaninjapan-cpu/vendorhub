import React from "react";
import Link from "next/link";

type Props = {
  stepLabel?: string; // e.g. "STEP 5 OF 5"
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export default function OnboardingShell({ stepLabel, title, subtitle, children }: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-12 gap-8">
          {/* Left rail */}
          <aside className="col-span-12 md:col-span-3">
            <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
              <div className="text-sm font-semibold text-gray-900">Seller Studio</div>
              <div className="mt-1 text-xs text-gray-500">Account Creation</div>

              <nav className="mt-6 space-y-3 text-sm">
                <div className="text-gray-400">Account Setup</div>
                <div className="text-gray-400">Identity</div>
                <div className="text-gray-400">Review</div>
              </nav>

              <div className="mt-6 border-t pt-4">
                <Link href="/onboarding/review" className="text-xs text-gray-500 hover:text-gray-700">
                  Back to Review
                </Link>
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="col-span-12 md:col-span-9">
            {stepLabel ? (
              <div className="text-xs font-semibold tracking-wide text-gray-500">{stepLabel}</div>
            ) : null}
            <h1 className="mt-2 text-3xl font-semibold text-gray-900">{title}</h1>
            {subtitle ? <p className="mt-2 text-sm text-gray-600 max-w-2xl">{subtitle}</p> : null}

            <div className="mt-8">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
