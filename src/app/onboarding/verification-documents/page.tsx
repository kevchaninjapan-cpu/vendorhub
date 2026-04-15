"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { uploadVerificationDoc } from "@/lib/uploadVerificationDoc";

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "success"; path: string; filename: string }
  | { status: "error"; message: string };

function StatusPill({ state }: { state: UploadState }) {
  if (state.status === "idle") {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
        Not uploaded
      </span>
    );
  }
  if (state.status === "uploading") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
        Uploading…
      </span>
    );
  }
  if (state.status === "success") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
        Uploaded
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-800">
      Error
    </span>
  );
}

export default function OnboardingVerificationDocumentsPage() {
  const [govIdUpload, setGovIdUpload] = useState<UploadState>({ status: "idle" });
  const [resUpload, setResUpload] = useState<UploadState>({ status: "idle" });

  const canContinue = useMemo(
    () => govIdUpload.status === "success" && resUpload.status === "success",
    [govIdUpload.status, resUpload.status]
  );

  const handleGovIdSelect = async (file: File | null) => {
    if (!file) {
      setGovIdUpload({ status: "idle" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setGovIdUpload({ status: "error", message: "Max file size is 10MB." });
      return;
    }

    setGovIdUpload({ status: "uploading" });
    try {
      const result = await uploadVerificationDoc({
        docType: "government_id",
        file,
      });

      setGovIdUpload({
        status: "success",
        path: result.path,
        filename: file.name,
      });
    } catch (e: any) {
      setGovIdUpload({
        status: "error",
        message: e?.message ?? "Upload failed.",
      });
    }
  };

  const handleResidenceSelect = async (file: File | null) => {
    if (!file) {
      setResUpload({ status: "idle" });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setResUpload({ status: "error", message: "Max file size is 20MB." });
      return;
    }

    setResUpload({ status: "uploading" });
    try {
      const result = await uploadVerificationDoc({
        docType: "proof_of_residence",
        file,
      });

      setResUpload({
        status: "success",
        path: result.path,
        filename: file.name,
      });
    } catch (e: any) {
      setResUpload({
        status: "error",
        message: e?.message ?? "Upload failed.",
      });
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      {/* IMPORTANT: remove this header if your (site) layout already renders VendorHub */}
      {/* Header */}
      <header className="mx-auto flex max-w-2xl items-center justify-between px-6 py-6">
        <div className="text-sm font-semibold text-slate-900">VendorHub</div>
        <Link href="/onboarding/details" className="text-sm text-slate-600 hover:text-slate-900">
          Back
        </Link>
      </header>

      <section className="mx-auto max-w-2xl px-6 pb-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-slate-900">
              Verification documents
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Upload your documents to verify your account. We’ll only use these for verification.
            </p>
          </div>

          {/* Government ID */}
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-900">Government ID</h2>
                  <StatusPill state={govIdUpload} />
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Passport or driver licence (max 10MB).
                </p>
                {govIdUpload.status === "success" && (
                  <p className="mt-2 text-xs text-emerald-700">
                    Uploaded: {govIdUpload.filename}
                  </p>
                )}
                {govIdUpload.status === "error" && (
                  <p className="mt-2 text-xs text-rose-700">
                    {govIdUpload.message}
                  </p>
                )}
              </div>

              <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50">
                Choose file
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleGovIdSelect(e.target.files?.[0] ?? null)}
                  disabled={govIdUpload.status === "uploading"}
                />
              </label>
            </div>
          </div>

          {/* Proof of residence */}
          <div className="mt-4 rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-900">Proof of address</h2>
                  <StatusPill state={resUpload} />
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Utility bill or bank statement (max 20MB).
                </p>
                {resUpload.status === "success" && (
                  <p className="mt-2 text-xs text-emerald-700">
                    Uploaded: {resUpload.filename}
                  </p>
                )}
                {resUpload.status === "error" && (
                  <p className="mt-2 text-xs text-rose-700">
                    {resUpload.message}
                  </p>
                )}
              </div>

              <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50">
                Choose file
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleResidenceSelect(e.target.files?.[0] ?? null)}
                  disabled={resUpload.status === "uploading"}
                />
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={canContinue ? "/onboarding/submitted" : "#"}
              aria-disabled={!canContinue}
              className={[
                "inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold",
                canContinue
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "cursor-not-allowed bg-slate-200 text-slate-500",
              ].join(" ")}
              onClick={(e) => {
                if (!canContinue) e.preventDefault();
              }}
            >
              Continue
            </Link>

            <p className="text-xs text-slate-500">
              You can continue once both documents are uploaded successfully.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
``