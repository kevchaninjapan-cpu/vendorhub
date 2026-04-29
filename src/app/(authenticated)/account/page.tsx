import { redirect } from "next/navigation";
import supabaseServer from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import AccountShell from "@/components/account/AccountShell";
import ProfileSection from "@/components/account/ProfileSection";
import VerificationSection from "@/components/account/VerificationSection";
import DocumentsSection from "@/components/account/DocumentsSection";
import ListingsSection from "@/components/account/ListingsSection";
import SignOutButton from "@/components/account/SignOutButton";

export default async function MyAccountPage() {
  const supabase = await supabaseServer();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();

  if (userErr || !user) redirect("/onboarding/welcome");

  const admin = supabaseAdmin();

  // Load profile
  const { data: profiles } = await admin
    .from("onboarding_profiles")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const profile = profiles?.[0] ?? null;

  if (!profile) redirect("/onboarding/details");

  // Load documents
  const { data: docs } = await admin
    .from("verification_documents")
    .select("*")
    .eq("user_id", user.id);

  const documents = docs ?? [];

  return (
    <AccountShell>
      {/* Profile */}
      <ProfileSection profile={profile} email={user.email ?? ""} />

      {/* Verification Status */}
      <VerificationSection status={profile.verification_status} />

      {/* Documents */}
      <DocumentsSection documents={documents} userId={user.id} />

      {/* My Listings */}
      <ListingsSection userId={user.id} />

      {/* Sign Out */}
      <div className="mt-6">
        <SignOutButton />
      </div>
    </AccountShell>
  );
}