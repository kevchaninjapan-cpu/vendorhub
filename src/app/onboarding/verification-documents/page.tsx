"use client";

import Link from "next/link";
import { useState } from "react";
import { uploadVerificationDoc } from "@/lib/uploadVerificationDoc";

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "success"; path: string; filename: string }
  | { status: "error"; message: string };

export default function OnboardingVerificationDocumentsPage() {
  const [idFile, setIdFile] = useState<File | null>(null);
  const [addressFile, setAddressFile] = useState<File | null>(null);

  const [govIdUpload, setGovIdUpload] = useState<UploadState>({ status: "idle" });
  const [resUpload, setResUpload] = useState<UploadState>({ status: "idle" });

  const canReview =
    govIdUpload.status === "success" && resUpload.status === "success";

  const handleGovIdSelect = async (file: File | null) => {
    setIdFile(file);
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
    setAddressFile(file);
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
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="text-sm font-semibold text-slate-900">VendorHub</div>
      </header>
    </main>
  );
}
