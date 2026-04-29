"use client";

import Link from "next/link";
import { useState } from "react";

type DocType = "bank" | "utility" | "government";

export default function OnboardingIdentityPage() {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocType | null>(null);

  const canComplete = !!file && !!docType;

  return (
    <main className="min-h-screen bg-slate-50">
      

      {/* Content */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-10 md:grid-cols-[260px_1fr_260px]">
        {/* Left rail */}
        <aside className="hidden md:block">
          <div className="text-xs font-semibold uppercase text-slate-900">
            Seller Studio
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Onboarding process
          </div>

          <ol className="mt-8 space-y-4 text-sm">
            <RailItem label="Account setup" status="complete" />
            <RailItem label="Identity" status="active" />
            <RailItem label="Business info" status="pending" />
            <RailItem label="Review" status="pending" />
            <RailItem label="Status" status="pending" />
          </ol>
        </aside>

        {/* Main */}
        <section>
          <div className="rounded-2xl bg-white p-8 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-900">
              Step 3 of 5
            </div>

            <h1 className="mt-2 text-3xl font-semibold text-slate-900">
              Verify your current address
            </h1>

            <p className="mt-2 max-w-lg text-sm text-slate-900">
              To maintain a secure marketplace, we require a recent proof of
              residency. This information is kept strictly confidential and used
              only for compliance purposes.
            </p>

            {/* Upload */}
            <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-6 text-center">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                id="file-upload"
                className="hidden"
                onChange={(e) =>
                  setFile(e.target.files ? e.target.files[0] : null)
                }
              />

              <label
                htmlFor="file-upload"
                className="flex cursor-pointer flex-col items-center gap-3"
              >
                <div className="grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-blue-600">
                  📄
                </div>
                <div className="text-sm font-medium text-slate-700">
                  Click to upload or drag and drop
                </div>
                <div className="text-xs text-slate-900">
                  PDF, JPG, or PNG (max 10MB)
                </div>
              </label>

              {file && (
                <div className="mt-4 text-sm text-slate-700">
                  Uploaded: <strong>{file.name}</strong>
                </div>
              )}
            </div>

            {/* Document type */}
            <div className="mt-6">
              <div className="mb-2 text-xs font-semibold uppercase text-slate-900">
                Document type
              </div>

              <div className="flex gap-3">
                <DocButton
                  label="Bank statement"
                  active={docType === "bank"}
                  onClick={() => setDocType("bank")}
                />
                <DocButton
                  label="Utility bill"
                  active={docType === "utility"}
                  onClick={() => setDocType("utility")}
                />
                <DocButton
                  label="Government document"
                  active={docType === "government"}
                  onClick={() => setDocType("government")}
                />
              </div>
            </div>

            {/* Footer actions */}
            <div className="mt-10 flex items-center justify-between">
              {/* Back */}
              <Link
                href="/onboarding/details"
                className="text-sm text-slate-900 hover:underline"
              >
                ← Go back
              </Link>

              {/* Actions */}
              <div className="flex items-center gap-3">
                {/* ✅ Skip button — CLEAR + VISIBLE */}
                <Link
                  href="/onboarding/business"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 hover:bg-slate-50"
                >
                  Skip this step (Account will be unverified)
                </Link>

                <button
                  type="button"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Save progress
                </button>

                {canComplete ? (
                  <Link
                    href="/onboarding/business"
                    className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Complete upload
                  </Link>
                ) : (
                  <span className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white opacity-50">
                    Complete upload
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Right guidance */}
        <aside className="hidden md:block">
          <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <div className="mb-3 text-sm font-semibold text-slate-900">
              Essential guidance
            </div>

            <ul className="space-y-3 text-sm text-slate-900">
              <li>
                <strong>Recent document</strong>
                <br />
                Must be issued within the last 3 months.
              </li>
              <li>
                <strong>Full name &amp; address</strong>
                <br />
                Must exactly match your account details.
              </li>
  <li>
    <strong>Clear &amp; legible</strong>
    <br />
    Ensure all corners are visible and text is readable.
  </li>
  <li>
    <strong>Verified Accounts</strong>
    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-900">
      <li>Create property listings</li>
      <li>Use negotiation tools to make and receive offers</li>
      <li>
        Purchase VendorHub packages to unlock additional features and benefits
      </li>
    </ul>
  </li>
</ul>
          </div>
        </aside>
      </section>
    </main>
  );
}

/* ---------- helpers ---------- */

function StepTab({
  label,
  active,
  complete,
}: {
  label: string;
  active?: boolean;
  complete?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`text-sm font-medium ${
          active
            ? "text-blue-600"
            : complete
            ? "text-slate-400"
            : "text-slate-900"
        }`}
      >
        {label}
      </span>
      {active && <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />}
    </div>
  );
}

function RailItem({
  label,
  status,
}: {
  label: string;
  status: "complete" | "active" | "pending";
}) {
  return (
    <li
      className={`${
        status === "active"
          ? "font-semibold text-blue-600"
          : status === "complete"
          ? "text-slate-400"
          : "text-slate-900"
      }`}
    >
      {label}
    </li>
  );
}

function DocButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm ring-1 ${
        active
          ? "bg-blue-600 text-white ring-blue-600"
          : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}