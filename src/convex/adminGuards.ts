import { getAuthUserId } from "@convex-dev/auth/server";
import { ROLES } from "./schema";
import type { QueryCtx } from "./_generated/server";

/** Returns the current user when they hold the admin role, otherwise null. */
export async function getCurrentAdmin(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  const user = await ctx.db.get(userId);
  return user?.role === ROLES.ADMIN ? user : null;
}

/** Throws unless the current user holds the admin role. */
export async function assertAdmin(ctx: QueryCtx) {
  const admin = await getCurrentAdmin(ctx);
  if (!admin) {
    throw new Error("This action is only available to administrators.");
  }
}
