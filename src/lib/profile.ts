// src/lib/profile.ts
import { cookies } from "next/headers";

type Role = string;

const ROLE_COOKIE = "vh_role";

export async function getOrCreateRole(defaultRole: Role = "vendor"): Promise<Role> {
  const cookieStore = await cookies();

  const existing = cookieStore.get(ROLE_COOKIE)?.value;
  if (existing && existing.trim().length > 0) return existing;

  cookieStore.set(ROLE_COOKIE, defaultRole, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365 // 1 year
  });

  return defaultRole;
}