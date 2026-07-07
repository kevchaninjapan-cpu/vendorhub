import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { reviewVerification } from "@/lib/verifications/actions";

export const metadata: Metadata = { title: "Verification queue — VendorHub" };
export const dynamic = "force-dynamic";

type PendingRow = {
  id: string;
  user_id: string;
  id_doc_type: string | null;
  id_doc_path: string | null;
  address_proof_path: string | null;
  selfie_path: string | null;
  notes: string | null;
  submitted_at: string | null;
  created_at: string;
};

async function signedUrl(supabase: any, path: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage.from("verifications").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export default async function VerificationQueuePage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "moderator"].includes((profile as any).role)) {
    redirect("/");
  }

  const { data: pending } = await supabase
    .from("verifications")
    .select("id, user_id, id_doc_type, id_doc_path, address_proof_path, selfie_path, notes, submitted_at, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const rows = (pending ?? []) as unknown as PendingRow[];

  const withUrls = await Promise.all(
    rows.map(async (r) => ({
      ...r,
      idUrl: await signedUrl(supabase, r.id_doc_path),
      addrUrl: await signedUrl(supabase, r.address_proof_path),
      selfieUrl: await signedUrl(supabase, r.selfie_path),
    }))
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Verification queue</h1>
        <p className="text-sm text-slate-600">
          {rows.length === 0
            ? "Nothing waiting."
            : `${rows.length} verification${rows.length === 1 ? "" : "s"} awaiting review`}
        </p>
      </header>

      <div className="space-y-4">
        {withUrls.map((r) => (
          <article key={r.id} className="rounded-md border bg-white p-4">
            <div className="flex justify-between text-xs text-slate-500">
              <span>User: {r.user_id.slice(0, 8)}…</span>
              <span>Submitted: {new Date(r.submitted_at ?? r.created_at).toLocaleString("en-NZ")}</span>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <DocPreview label={`ID (${r.id_doc_type ?? "?"})`} url={r.idUrl} />
              <DocPreview label="Proof of address" url={r.addrUrl} />
              <DocPreview label="Selfie" url={r.selfieUrl} />
            </div>

            {r.notes && (
              <p className="mt-2 text-xs italic text-slate-600">Notes: {r.notes}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <ApproveForm id={r.id} />
              <RejectForm id={r.id} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function DocPreview({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="rounded border bg-slate-50 p-2 text-xs">
      <p className="mb-1 font-semibold">{label}</p>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer"
           className="text-blue-600 underline">
          Open document
        </a>
      ) : (
        <span className="text-slate-400">Not provided</span>
      )}
    </div>
  );
}

function ApproveForm({ id }: { id: string }) {
  async function action() {
    "use server";
    await reviewVerification(id, true, "");
  }
  return (
    <form action={action}>
      <button className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
        Approve
      </button>
    </form>
  );
}

function RejectForm({ id }: { id: string }) {
  async function action(formData: FormData) {
    "use server";
    const reason = (formData.get("reason") as string) || "Documents unclear";
    await reviewVerification(id, false, reason);
  }
  return (
    <form action={action} className="flex gap-1">
      <input name="reason" placeholder="Reason" className="rounded border px-2 py-1 text-xs" />
      <button className="rounded border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">
        Reject
      </button>
    </form>
  );
}
