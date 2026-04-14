"use client";

import React from "react";
import { useRouter } from "next/navigation";
import OnboardingShell from "./OnboardingShell";
import {
  loadOnboardingProfile,
  nextRouteAfterSubmit,
  saveOnboardingProfile,
  type OnboardingProfile,
} from "./onboardingStore";

function DocIcon({ status }: { status: "uploaded" | "missing" | "required" }) {
  if (status === "uploaded") {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        ✓
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-50 text-red-600">
      !
    </span>
  );
}

export default function ReviewSubmitClient() {
  const router = useRouter();
  const [profile, setProfile] = React.useState<OnboardingProfile>(() => loadOnboardingProfile());
  const [confirmed, setConfirmed] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    // keep localStorage in sync if profile changes
    saveOnboardingProfile(profile);
  }, [profile]);

  const onSubmit = async () => {
    if (!confirmed || submitting) return;
    setSubmitting(true);

    // TODO: replace this with your real submit call (Supabase, API route, etc.)
    // For now we just branch based on uploaded docs.
    const next = nextRouteAfterSubmit(profile);
    router.push(next);
  };

  return (
    <OnboardingShell
      stepLabel="STEP 5 OF 5"
      title="Review & Submit"
      subtitle="Please ensure all information provided is accurate. This executive summary will be used by our compliance team for final verification."
    >
      <div className="grid grid-cols-12 gap-6">
        {/* Left column: Summary cards */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="rounded-xl bg-white shadow-sm border border-gray-100">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Personal Information</h2>
              <button
                type="button"
                className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
                onClick={() => router.push("/onboarding/identity")}
              >
                ✎ <span>EDIT</span>
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="grid grid-cols-2 gap-x-10 gap-y-6">
                <div>
                  <div className="text-[11px] font-semibold text-gray-500">FULL NAME</div>
                  <div className="mt-1 text-sm text-gray-900">{profile.fullName}</div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-gray-500">OFFICIAL EMAIL</div>
                  <div className="mt-1 text-sm text-gray-900">{profile.officialEmail}</div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-gray-500">BUSINESS PHONE</div>
                  <div className="mt-1 text-sm text-gray-900">{profile.businessPhone}</div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-gray-500">TAX IDENTIFICATION</div>
                  <div className="mt-1 text-sm text-gray-900">{profile.taxIdMasked}</div>
                </div>
              </div>

              <div className="mt-8 border-t border-gray-100 pt-6">
                <h3 className="text-sm font-semibold text-gray-900">Registered Address</h3>
                <div className="mt-3 text-sm text-gray-700 leading-6">
                  <div>{profile.registeredAddress.line1}</div>
                  {profile.registeredAddress.line2 ? <div>{profile.registeredAddress.line2}</div> : null}
                  <div>
                    {profile.registeredAddress.city}
                    {profile.registeredAddress.postcode ? `, ${profile.registeredAddress.postcode}` : ""}
                  </div>
                  <div className="font-semibold text-gray-900">{profile.registeredAddress.country}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Final Verification info panel */}
          <div className="rounded-xl bg-gray-100/70 border border-gray-200 px-6 py-5">
            <div className="text-sm font-semibold text-gray-900">Final Verification</div>
            <p className="mt-2 text-sm text-gray-600">
              Upon submission, your profile will enter a 24–48 hour review cycle. You will receive an encrypted
              notification once the process is complete.
            </p>
          </div>
        </div>

        {/* Right column: Uploaded documents + declaration + submit */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="rounded-xl bg-white shadow-sm border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Uploaded Documents</h2>
            </div>

            <div className="px-6 py-5 space-y-3">
              {(profile.uploadedDocuments ?? []).map((doc) => (
                <div
                  key={doc.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${
                    doc.status === "uploaded" ? "border-gray-100 bg-gray-50" : "border-red-100 bg-red-50/40"
                  }`}
                >
                  <DocIcon status={doc.status} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{doc.label}</div>
                    {doc.status !== "uploaded" ? (
                      <div className="mt-1 text-xs text-red-600">{doc.helper ?? "Required for verification"}</div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Declaration */}
          <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-5">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span className="text-sm text-gray-700 leading-6">
                I confirm that the information provided is true and complete to the best of my knowledge.
                <br />
                <span className="text-gray-500">
                  Any inaccurate or misleading representation may lead to account suspension.
                </span>
              </span>
            </label>

            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                onClick={() => router.push("/dashboard")}
              >
                SAVE DRAFT AND EXIT
              </button>

              <button
                type="button"
                onClick={onSubmit}
                disabled={!confirmed || submitting}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                  !confirmed || submitting ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {submitting ? "Submitting..." : "Submit for verification"}
                <span aria-hidden>→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}
