import type { Database } from "@/types/supabase";
import supabaseServer from "@/lib/supabaseServer";

type VerificationDoc = Database["public"]["Tables"]["verification_documents"]["Row"];

export async function getOnboardingProfile(userId: string) {
  const supabase = await supabaseServer();

  const { data: profile, error } = await supabase
    .from("onboarding_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) throw error;

  const { data: documents, error: docErr } = await supabase
    .from("verification_documents")
    .select("id, doc_type, status, file_path, created_at")
    .eq("user_id", userId);

  if (docErr) throw docErr;

  return {
    ...profile,
    verification_documents: (documents ?? []) as Pick<
      VerificationDoc,
      "id" | "doc_type" | "status" | "file_path" | "created_at"
    >[],
  };
}

export function nextRouteAfterSubmit(profile: {
  verification_documents: { status: string }[];
}) {
  const hasAnyDocs = profile.verification_documents.some(
    (d) => d.status === "uploaded"
  );

  return hasAnyDocs ? "/onboarding/submitted" : "/onboarding/success";
}
