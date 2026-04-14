import { redirect, notFound } from "next/navigation";
import supabaseServer from "@/lib/supabaseServer";
import ReviewActions from "./review-actions";

type PageProps = {
  params: { userId: string };
};

export default async function VerificationReview({ params }: PageProps) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "admin") {
    redirect("/unauthorized");
  }

  const { data: profile, error: profileErr } = await supabase
    .from("onboarding_profiles")
    .select("*")
    .eq("user_id", params.userId)
    .single();

  if (profileErr || !profile) {
    notFound();
  }

  const { data: documents, error: docErr } = await supabase
    .from("verification_documents")
    .select("id, doc_type, file_path, status, created_at")
    .eq("user_id", params.userId)
    .order("created_at", { ascending: true });

  if (docErr) throw docErr;

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{profile.full_name}</h1>
        <p className="text-sm text-gray-600">{profile.official_email}</p>
        <p className="text-xs text-gray-500 mt-1">
          Status:{" "}
          <span className="font-semibold">{profile.verification_status}</span>
        </p>
      </div>

      <div>
        <h2 className="font-semibold">Uploaded Documents</h2>

        {documents && documents.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between rounded border p-3 text-sm"
              >
                <div>
                  <div className="font-medium">
                    {String(doc.doc_type).replace(/_/g, " ")}
                  </div>
                  <div className="text-xs text-gray-500">
                    Uploaded {new Date(doc.created_at).toLocaleString()}
                  </div>
                </div>

                <a
                  href={doc.file_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-gray-500">
            No verification documents uploaded.
          </p>
        )}
      </div>

      <ReviewActions userId={params.userId} />
    </div>
  );
}