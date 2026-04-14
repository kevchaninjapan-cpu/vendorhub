import { redirect } from "next/navigation";
import supabaseServer from "@/lib/supabaseServer";

export default async function AdminVerificationQueue() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata.role !== "admin") {
    redirect("/unauthorized");
  }

  const { data: profiles } = await supabase
    .from("onboarding_profiles")
    .select("user_id, full_name, official_email, created_at")
    .eq("verification_status", "pending")
    .order("created_at", { ascending: true });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Verification Queue</h1>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Submitted</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {profiles?.map(p => (
            <tr key={p.user_id}>
              <td>{p.full_name}</td>
              <td>{p.official_email}</td>
              <td>{new Date(p.created_at).toLocaleDateString()}</td>
              <td>
                <a
                  href={`/admin/verification/${p.user_id}`}
                  className="text-blue-600"
                >
                  Review →
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
