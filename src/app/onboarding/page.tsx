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
  const { data: profile } = await supabase
    .from("onboarding_profiles")
    .select("verification_status")
    .eq("user_id", user.id)
    .single();

  // 3️⃣ No profile yet → start onboarding
  if (!profile) redirect("/onboarding/details");

  // 4️⃣ Decide next step based on status
  switch (profile.verification_status) {
    case "not_started":
      redirect("/onboarding/details");

    case "pending":
      redirect("/onboarding/submitted"); // ✅ stays on submitted after sign in

    case "verified":
      redirect("/app/account");

    default:
      redirect("/onboarding/details");
  }
}