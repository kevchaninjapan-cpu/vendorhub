// lib/guards.ts
import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/lib/auth";

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/auth/sign-in");
  return user;
}

export async function requireAdmin() {
  const profile = await getProfile();
  if (!profile?.is_admin) redirect("/"); // non-admins go home
  return profile;
}