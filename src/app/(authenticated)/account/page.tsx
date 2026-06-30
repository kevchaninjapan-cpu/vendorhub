import Link from "next/link";
import { redirect } from "next/navigation";
import supabaseServer from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import AccountShell from "@/components/account/AccountShell";
import SignOutButton from "@/components/account/SignOutButton";

export const dynamic = "force-dynamic";

export default async function MyAccountPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) redirect("/sign-in");

  const admin = supabaseAdmin();

  // Pull profile from the new `profiles` table (id = auth.users.id).
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .eq("id", user.id)
    .single<{
      id: string;
      email: string | null;
      full_name: string | null;
      role: string;
      created_at: string;
    }>();

  return (
    <AccountShell>
      {/* Profile summary */}
      <section className="rounded-2xl border border-border/40 bg-surface p-5">
        <h2 className="text-sm font-semibold">Profile</h2>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <Field label="Name" value={profile?.full_name ?? "—"} />
          <Field label="Email" value={profile?.email ?? user.email ?? "—"} />
          <Field label="Role" value={profile?.role ?? "member"} />
          <Field
            label="Joined"
            value={
              profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString("en-NZ")
                : "—"
            }
          />
        </div>
      </section>

      {/* Verification (Sprint 3 placeholder) */}
      <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-sm font-semibold text-amber-900">
          Identity verification
        </h2>
        <p className="mt-1 text-xs text-amber-800">
          We&apos;re rolling out a new verification flow soon. You&apos;ll be
          able to upload your ID and proof of address to unlock making offers
          on listings.
        </p>
      </section>

      {/* Listings */}
      <section className="mt-4 rounded-2xl border border-border/40 bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">My listings</h2>
            <p className="mt-1 text-xs text-muted">
              Manage your drafts, live listings, and offers.
            </p>
          </div>
          <Link
            href="/account/listings"
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            Open dashboard →
          </Link>
        </div>
      </section>

      {/* Saved listings */}
      <section className="mt-4 rounded-2xl border border-border/40 bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Saved listings</h2>
            <p className="mt-1 text-xs text-muted">
              Properties you&apos;ve hearted from the marketplace.
            </p>
          </div>
          <Link
            href="/account/saved"
            className="rounded-md border px-3 py-1.5 text-xs font-semibold"
          >
            View saved →
          </Link>
        </div>
      </section>

      <div className="mt-6">
        <SignOutButton />
      </div>
    </AccountShell>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}