// src/lib/rbac.ts
export type Role = "seller" | "admin" | "ops";

export const DEFAULT_ROLE: Role = "seller";

export const ROLE_PRIORITY: Role[] = ["admin", "ops", "seller"];

export const routeRoleMap: Array<{
  prefix: string;
  allow: Role[];
}> = [
  // Seller app
  { prefix: "/app", allow: ["seller", "admin", "ops"] },
  { prefix: "/app/listings", allow: ["seller", "admin", "ops"] },
  { prefix: "/app/listings/new", allow: ["seller", "admin", "ops"] },

  // Ops/admin console
  { prefix: "/admin", allow: ["admin", "ops"] },
  { prefix: "/ops", allow: ["ops", "admin"] },
];

export function requiredRolesForPath(pathname: string): Role[] | null {
  const hit = routeRoleMap.find(r => pathname.startsWith(r.prefix));
  return hit ? hit.allow : null;
}

export function hasAnyRole(userRole: Role | null | undefined, allowed: Role[]): boolean {
  if (!userRole) return false;
  return allowed.includes(userRole);
}