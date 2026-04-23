"use server";

import { redirect } from "next/navigation";
import supabaseServer from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type VerificationDoc = {
  doc_type: string;
  status: string;
};

export async function submitForVerification() {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) redirect("/onboarding/welcome");

  const admin = supabaseAdmin();

  // Re-check docs server-side
  const { data: docs } = await admin
    .from("verification_documents")
    .select("doc_type, status")
    .eq("user_id", user.id);

  const documents: VerificationDoc[] = docs ?? [];

  const hasGovId = documents.some(
    (d) => d.doc_type === "government_id" && d.status === "uploaded"
  );
  const hasResidence = documents.some(
    (d) => d.doc_type === "proof_of_residence" && d.status === "uploaded"
  );

  if (!hasGovId || !hasResidence) {
    redirect("/onboarding/verification-documents");
  }

  const { error: updateErr } = await admin
    .from("onboarding_profiles")
    .update({ verification_status: "pending" })
    .eq("user_id", user.id);

  if (updateErr) {
    console.error("[REVIEW] Update failed:", updateErr.message, updateErr.code);
    redirect("/onboarding/review");
  }

  console.log("[REVIEW] Status updated to pending for:", user.id);
  redirect("/onboarding/submitted");
}