import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getStaffRole, type StaffRole } from "@/lib/auth/admin";

// The signed-in user and their staff role, or null if they aren't staff.
export async function getStaff(): Promise<{ userId: string; role: StaffRole } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const role = await getStaffRole(user.id);
  return role ? { userId: user.id, role } : null;
}