import "server-only";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { ADMIN_ROLES, hasPermission, type AdminRole, type Permission } from "@/lib/permissions";

export { ADMIN_ROLES, hasPermission };
export type { AdminRole, Permission };

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

/** Throws HttpError(401) if not logged in, or HttpError(403) if banned/suspended. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "You must be signed in.");
  if (user.status === "BANNED" || user.status === "DELETED") {
    throw new HttpError(403, "This account has been banned.");
  }
  if (user.status === "SUSPENDED") {
    throw new HttpError(403, "This account is suspended.");
  }
  return user;
}

/** Throws HttpError(403) if the signed-in user's email is not verified. */
export async function requireVerifiedUser() {
  const user = await requireUser();
  if (!user.verified) {
    throw new HttpError(403, "Please verify your email address first.");
  }
  return user;
}

/** Throws HttpError(401/403) unless the signed-in user is an active admin with the given permission. */
export async function requireAdmin(permission?: Permission) {
  const user = await requireUser();
  if (!user.adminRole) throw new HttpError(403, "Admin access required.");
  if (permission && !hasPermission(user.adminRole, permission)) {
    throw new HttpError(403, `Your admin role (${user.adminRole}) cannot perform this action.`);
  }
  return user;
}

/** Wraps a route handler body, converting HttpError into a proper JSON response. */
export function apiHandler<T>(fn: () => Promise<T>) {
  return fn().then(
    (data) => NextResponse.json(data),
    (err) => {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error(err);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    },
  );
}
