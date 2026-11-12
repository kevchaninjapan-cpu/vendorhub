"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  createDocumentUploadUrl,
  recordDocument,
  updateDocument,
  deleteDocument,
  requestDownload,
} from "@/lib/documents/actions";
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_VISIBILITIES,
  DOCUMENT_VISIBILITY_LABELS,
  DOCUMENT_VISIBILITY_SHORT,
  MAX_DOCUMENT_BYTES,
  SINGLE_CURRENT_TYPES,
  formatFileSize,
  type DocumentType,
  type DocumentVisibility,
  type PublicListingDocument,
} from "@/lib/documents/schema";

export type OwnerDocumentRow = PublicListingDocument & { downloads: number };

const BUCKET = "listing-disclosures";
const ACCEPT = ".pdf,.jpg,.jpeg,.png,.doc,.docx";

type Notice = { kind: "ok" | "error"; text: string } | null;

export default function DocumentsManager({
  listingId,
  documents,
}: {
  listingId: string;
  documents: OwnerDocumentRow[];
}) {
  const router = useRouter();
  const [docType, setDocType] = useState<DocumentType>("lim");
  const [visibility, setVisibility] = useState<DocumentVisibility>("verified_buyers");
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const current = documents.find((d) => d.doc_type === docType);
  const willReplace = SINGLE_CURRENT_TYPES.includes(docType) && Boolean(current);

  async function handleUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNotice(null);

    if (!file) {
      setNotice({ kind: "error", text: "Choose a file to upload." });
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      setNotice({ kind: "error", text: "That file is over the 25 MB limit." });
      return;
    }
    if (!(ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
      setNotice({ kind: "error", text: "Use a PDF, JPG, PNG or Word document." });
      return;
    }

    setUploading(true);
    try {
      const signed = await createDocumentUploadUrl(listingId, file.name);
      if (!signed.ok) throw new Error(signed.error);

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .uploadToSignedUrl(signed.data.path, signed.data.token, file, { contentType: file.type });
      if (uploadError) throw new Error(uploadError.message);

      const recorded = await recordDocument({
        listing_id: listingId,
        doc_type: docType,
        visibility,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        label: label.trim() || undefined,
        file_path: signed.data.path,
      });
      if (!recorded.ok) throw new Error(recorded.error);

      setNotice({
        kind: "ok",
        text:
          recorded.data.replaced > 0
            ? `${DOCUMENT_TYPE_LABELS[docType]} replaced.`
            : `${DOCUMENT_TYPE_LABELS[docType]} uploaded.`,
      });
      setFile(null);
      setLabel("");
      setInputKey((k) => k + 1);
      router.refresh();
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "Upload failed." });
    } finally {
      setUploading(false);
    }
  }

  async function handleVisibility(id: string, value: DocumentVisibility) {
    setRowBusy(id);
    setNotice(null);
    const res = await updateDocument(id, { visibility: value });
    setRowBusy(null);
    if (!res.ok) {
      setNotice({ kind: "error", text: res.error });
      return;
    }
    router.refresh();
  }

  async function handleDelete(doc: OwnerDocumentRow) {
    const name = doc.label || doc.file_name;
    if (!window.confirm(`Delete "${name}"? Buyers will no longer be able to download it.`)) return;

    setRowBusy(doc.id);
    setNotice(null);
    const res = await deleteDocument(doc.id);
    setRowBusy(null);
    if (!res.ok) {
      setNotice({ kind: "error", text: res.error });
      return;
    }
    setNotice({ kind: "ok", text: `${DOCUMENT_TYPE_LABELS[doc.doc_type]} deleted.` });
    router.refresh();
  }

  async function handleView(id: string) {
    // Open the tab synchronously so popup blockers allow it, then point it at
    // the signed URL once it has been minted.
    const win = window.open("about:blank", "_blank");
    if (win) win.opener = null;

    const res = await requestDownload(id);
    if (!res.ok) {
      win?.close();
      setNotice({ kind: "error", text: res.error });
      return;
    }
    if (win) win.location.href = res.data.url;
    else window.location.href = res.data.url;
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleUpload} className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900">Upload a document</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Document type</span>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocumentType)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DOCUMENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Who can download</span>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as DocumentVisibility)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {DOCUMENT_VISIBILITIES.map((v) => (
                <option key={v} value={v}>
                  {DOCUMENT_VISIBILITY_SHORT[v]}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-slate-500">
              {DOCUMENT_VISIBILITY_LABELS[visibility]}
            </span>
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">Label (optional)</span>
            <input
              type="text"
              value={label}
              maxLength={200}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. LIM - Auckland Council, Aug 2026"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">File</span>
            <input
              key={inputKey}
              type="file"
              accept={ACCEPT}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm text-slate-700"
            />
            <span className="mt-1 block text-xs text-slate-500">
              PDF, JPG, PNG or Word. Up to 25 MB.
            </span>
          </label>
        </div>

        {willReplace && current ? (
          <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This will replace your current {DOCUMENT_TYPE_LABELS[docType]} (
            {current.label || current.file_name}). Buyers only ever see the latest one.
          </p>
        ) : null}

        {notice ? (
          <p
            className={
              notice.kind === "ok"
                ? "mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
                : "mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700"
            }
          >
            {notice.text}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={uploading || !file}
          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {uploading ? "Uploading..." : willReplace ? "Replace document" : "Upload document"}
        </button>
      </form>

      <section>
        <h2 className="text-base font-semibold text-slate-900">Your documents</h2>

        {documents.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            No documents yet. A LIM and record of title are the two buyers ask for first.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {documents.map((d) => (
              <li
                key={d.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {DOCUMENT_TYPE_LABELS[d.doc_type]}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {d.label || d.file_name}
                    {d.file_size ? ` - ${formatFileSize(d.file_size)}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {d.downloads === 1
                      ? "1 buyer has downloaded this"
                      : `${d.downloads} buyers have downloaded this`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    aria-label="Who can download"
                    value={d.visibility}
                    disabled={rowBusy === d.id}
                    onChange={(e) => handleVisibility(d.id, e.target.value as DocumentVisibility)}
                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                  >
                    {DOCUMENT_VISIBILITIES.map((v) => (
                      <option key={v} value={v}>
                        {DOCUMENT_VISIBILITY_SHORT[v]}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => handleView(d.id)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    View
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(d)}
                    disabled={rowBusy === d.id}
                    className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}