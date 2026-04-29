import Link from "next/link";
import Image from "next/image";

export default function OnboardingWelcomePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Top bar */}
      {/* Main content */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 py-10 md:grid-cols-2 md:py-16">
        {/* Left */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700 ring-1 ring-blue-100">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Verification status: <span className="text-blue-900">Unverified</span>
          </div>

          <h1 className="mt-6 text-5xl font-semibold tracking-tight text-slate-900">
            Welcome to <span className="text-blue-600">VendorHub</span>.
          </h1>

          <p className="mt-5 max-w-lg text-sm leading-6 text-slate-900">
            Begin your journey with VendorHub. Our secure verification process
            ensures a premium ecosystem for buyers and sellers to list, browse,
            and transact intelligently.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {/* ✅ Start onboarding */}
            <Link
              href="/onboarding/details"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Create account <span aria-hidden>→</span>
            </Link>

            {/* ✅ Sign-in resumes onboarding via router */}
            <Link
              href="/signin?redirect=/onboarding"
              className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              Sign in
            </Link>
          </div>

          <div className="mt-10 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 ring-1 ring-blue-100">
                <span className="text-blue-700">🛡️</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Verification unlocks full access
                </div>
                <p className="mt-1 text-sm text-slate-900">
                  Create an account to get started. Full verification grants you
                  access to all platform features.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="relative">
          <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="relative aspect-[4/3] w-full bg-slate-200">
              <Image
                src="/images/onboarding/welcome-preview.jpg"
                alt="VendorHub preview"
                fill
                className="object-cover"
                sizes="(min-width: 768px) 50vw, 100vw"
                priority
              />
            </div>

            <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white/95 p-4 shadow-sm ring-1 ring-slate-200 backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-900">
                  Market Insights
                </div>
                <div className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-blue-100">
                  PREMIUM ACCESS
                </div>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                <div className="h-2 w-[35%] rounded-full bg-blue-600" />
              </div>
              <div className="mt-2 text-[11px] text-slate-900">
                Step 1 of 3 · Establish your digital presence
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ---------- helpers ---------- */

function StepTab({
  label,
  active,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`text-sm font-medium ${
          active ? "text-blue-600" : "text-slate-900"
        }`}
      >
        {label}
      </span>
      {active && <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />}
    </div>
  );
}