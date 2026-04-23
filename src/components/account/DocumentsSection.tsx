"use client";

import { useState } from "react";
import { uploadVerificationDoc } from "@/lib/uploadVerificationDoc";

type Doc = {
  id: string;
  doc_type: string;
  status: string;
  file_path?: string | null;
};

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "success" }
  | { status: "error"; message: string };

const DOC_LABELS: Record<string, string> = {
  government_id: "Government ID",
  proof_of_residence: "Proof of Residence",
};

export default function DocumentsSection({
  documents,
  userId,
}: {
  documents: Doc[];
  userId: string;
}) {
  const [uploadStates, setUploadStates] = useState<
    Record<string, UploadState>
  >({});

  const getDoc = (type: string) =>
    documents.find((d) => d.doc_type === type) ?? null;

  const setDocState = (docType: string, state: UploadState) => {
    setUploadStates((prev) => ({ ...prev, [docType]: state }));
  };

  const handleUpload = async (
    docType: "government_id" | "proof_of_residence",
    file: File
  ) => {
    setDocState(docType, { status: "uploading" });
    try {
      await uploadVerificationDoc({ docType, file });
      setDocState(docType, { status: "success" });
      setTimeout(() => window.location.reload(), 800);
    } catch (e: any) {
      setDocState(docType, {
        status: "error",
        message: e?.message ?? "Upload failed.",
      });
    }
  };

  return (
    <section
      id="documents"
      className="rounded-xl bg-white shadow-sm border border-gray-100 p-6"
    >
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        Verification Documents
      </h2>

      <div className="space-y-4">
        {(["government_id", "proof_of_residence"] as const).map((docType) => {
          const doc = getDoc(docType);
          const uploadState: UploadState =
            uploadStates[docType] ?? { status: "idle" };

          return (
            <div
              key={docType}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
            >
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {DOC_LABELS[docType]}
                </div>
                <div className="mt-0.5">
                  {uploadState.status === "uploading" && (
                    <span className="text-xs text-amber-700">Uploading…</span>
                  )}
                  {uploadState.status === "success" && (
                    <span className="text-xs text-emerald-700">
                      Uploaded successfully
                    </span>
                  )}
                  {uploadState.status === "error" && (
                    <span className="text-xs text-red-600">
                      {uploadState.message}
                    </span>
                  )}
                  {uploadState.status === "idle" && (
                    <span
                      className={`text-xs font-medium ${
                        doc?.status === "uploaded"
                          ? "text-emerald-700"
                          : "text-rose-700"
                      }`}
                    >
                      {doc?.status === "uploaded" ? "✓ Uploaded" : "Missing"}
                    </span>
                  )}
                </div>
              </div>

              <label className="inline-flex cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                {doc ? "Replace" : "Upload"}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,application/pdf"
                  disabled={uploadState.status === "uploading"}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(docType, file);
                  }}
                />
              </label>
            </div>
          );
        })}
      </div>
    </section>
  );
}