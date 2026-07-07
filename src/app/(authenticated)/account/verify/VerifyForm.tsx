"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { submitVerification } from "@/lib/verifications/actions";

type DocType = "passport" | "drivers_licence" | "national_id";

export default function VerifyForm({ userId }: { userId: string }) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();
  const [docType, setDocType] = useState<DocType>("passport");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [addrFile, setAddrFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function uploadOne(file: File, kind: string): Promise<string> {
    const safe = file.name.replace(/[^a-z0-9.\-_]/gi, "_");
    const path = `${userId}/${kind}-${Date.now()}-${safe}`;
    const { error } = await supabase.storage
      .from("verifications")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    return path;
  }

  async function submit() {
    if (!idFile || !addrFile) {
      toast.error("Upload both ID and proof of address");
      return;
    }
    setBusy(true);
    try {
      const [idPath, addrPath, selfiePath] = await Promise.all([
        uploadOne(idFile, "id"),
        uploadOne(addrFile, "addr"),
        selfieFile ? uploadOne(selfieFile, "selfie") : Promise.resolve(""),
      ]);
      await submitVerification({
        id_doc_type: docType,
        id_doc_path: idPath,
        address_proof_path: addrPath,
        selfie_path: selfiePath || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success("Verification submitted. We'll review within 1 business day.");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border bg-white p-5">
      <Field label="ID document type">
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value as DocType)}
          className="w-full rounded border px-3 py-2 text-sm"
        >
          <option value="passport">Passport</option>
          <option value="drivers_licence">NZ driver&apos;s licence</option>
          <option value="national_id">National ID card</option>
        </select>
      </Field>

      <Field label="Upload ID document (JPG/PNG/PDF)">
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm"
        />
      </Field>

      <Field label="Upload proof of address (utility bill, bank statement within 3 months)">
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setAddrFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm"
        />
      </Field>

      <Field label="Optional: selfie holding your ID (speeds up review)">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setSelfieFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm"
        />
      </Field>

      <Field label="Notes (optional)">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded border px-3 py-2 text-sm"
          placeholder="Anything we should know?"
        />
      </Field>

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-slate-600">
          Your documents are encrypted and only visible to VendorHub admins.
        </p>
        <Button onClick={submit} loading={busy} disabled={!idFile || !addrFile}>
          {busy ? "Uploading" : "Submit for review"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
    </label>
  );
}
