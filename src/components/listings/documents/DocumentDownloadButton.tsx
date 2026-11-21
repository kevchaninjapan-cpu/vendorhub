"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { requestDownload } from "@/lib/documents/actions";

export type DownloadAccess = "download" | "signin" | "verify";

const linkClass =
  "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50";

export default function DocumentDownloadButton({
  documentId,
  access,
}: {
  documentId: string;
  access: DownloadAccess;
}) {
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (access === "signin") {
    return (
      <Link href={`/signin?redirect=${encodeURIComponent(pathname)}`} className={linkClass}>
        Sign in to download
      </Link>
    );
  }

  if (access === "verify") {
    return (
      <Link href="/account/verify" className={linkClass}>
        Verify ID to download
      </Link>
    );
  }

  async function handleClick() {
    setBusy(true);
    setError(null);

    // Open the tab synchronously so popup blockers allow it.
    const win = window.open("about:blank", "_blank");
    if (win) win.opener = null;

    const res = await requestDownload(documentId);
    setBusy(false);

    if (!res.ok) {
      win?.close();
      setError(res.error);
      return;
    }
    if (win) win.location.href = res.data.url;
    else window.location.href = res.data.url;
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {busy ? "Preparing..." : "Download"}
      </button>
      {error ? <p className="mt-1 max-w-xs text-right text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}