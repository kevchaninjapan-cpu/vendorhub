import { redirect } from "next/navigation";
import supabaseServer from "@/lib/supabaseServer";

export default async function OnboardingRouterPage() {
  const supabase = await supabaseServer();

  // 1️⃣ Must be logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/onboarding/welcome");

  // 2️⃣ Fetch onboarding state
  const { data: profiles } = await supabase
    .from("onboarding_profiles")
    .select("verification_status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const profile = profiles?.[0] ?? null;

  // 3️⃣ No profile yet → start onboarding
  if (!profile) redirect("/onboarding/details");

  // 4️⃣ Decide next step based on status
  switch (profile.verification_status) {
    case "not_started":
      redirect("/onboarding/details");

    case "pending":
      redirect("/account"); // ✅ Go straight to account

    case "verified":
      redirect("/account"); // ✅ Go straight to account

    default:
      redirect("/onboarding/details");
  }
}