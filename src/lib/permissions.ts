// Pure permission-matrix logic, deliberately dependency-free (no auth.ts,
// no next-auth, no Prisma) so it can be unit-tested and imported without
// pulling in the entire auth stack.

export const ADMIN_ROLES = ["SUPER_ADMIN", "MODERATOR", "SUPPORT_AGENT", "FINANCE_ADMIN"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

/** Permission matrix: which admin roles may perform which coarse-grained action. */
export const PERMISSIONS = {
  "users.view": ["SUPER_ADMIN", "MODERATOR", "SUPPORT_AGENT", "FINANCE_ADMIN"],
  "users.suspend": ["SUPER_ADMIN", "MODERATOR", "SUPPORT_AGENT"],
  "users.ban": ["SUPER_ADMIN", "MODERATOR"],
  "users.delete": ["SUPER_ADMIN"],
  "listings.view": ["SUPER_ADMIN", "MODERATOR", "SUPPORT_AGENT", "FINANCE_ADMIN"],
  "listings.moderate": ["SUPER_ADMIN", "MODERATOR"],
  "categories.manage": ["SUPER_ADMIN"],
  "payments.view": ["SUPER_ADMIN", "FINANCE_ADMIN"],
  "payments.refund": ["SUPER_ADMIN", "FINANCE_ADMIN"],
  "reports.moderate": ["SUPER_ADMIN", "MODERATOR", "SUPPORT_AGENT"],
  "reviews.moderate": ["SUPER_ADMIN", "MODERATOR"],
  "settings.manage": ["SUPER_ADMIN"],
  "admins.manage": ["SUPER_ADMIN"],
  "content.manage": ["SUPER_ADMIN", "MODERATOR"],
  "analytics.view": ["SUPER_ADMIN", "MODERATOR", "FINANCE_ADMIN"],
} as const satisfies Record<string, readonly AdminRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: string | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly string[])?.includes(role) ?? false;
}
