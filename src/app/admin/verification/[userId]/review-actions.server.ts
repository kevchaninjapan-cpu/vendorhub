"use server";

import supabaseServer from "@/lib/supabaseServer";
import { redirect } from "next/navigation";

async function assertAdmin() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "admin") {
    // Hard stop: don’t reveal anything, don’t proceed
    redirect("/unauthorized");
  }

  return { supabase, user };
}

export async function approveVerification(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  if (!userId) redirect("/admin/verification");

  const { supabase, user } = await assertAdmin();

  const { error: updErr } = await supabase
    .from("onboarding_profiles")
    .update({ verification_status: "verified" })
    .eq("user_id", userId);

  if (updErr) throw updErr;

  const { error: insErr } = await supabase.from("verification_reviews").insert({
    user_id: userId,
    reviewer_id: user.id,
    decision: "approved",
    reason: null,
  });

  if (insErr) throw insErr;

  redirect("/admin/verification");
}

export async function rejectVerification(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!userId) redirect("/admin/verification");
  if (!reason) redirect(`/admin/verification/${userId}`);

  const { supabase, user } = await assertAdmin();

  const { error: updErr } = await supabase
    .from("onboarding_profiles")
    .update({ verification_status: "not_started" })
    .eq("user_id", userId);

  if (updErr) throw updErr;

  const { error: insErr } = await supabase.from("verification_reviews").insert({
    user_id: userId,
    reviewer_id: user.id,
    decision: "rejected",
    reason,
  });

  if (insErr) throw insErr;

  redirect("/admin/verification");
}
