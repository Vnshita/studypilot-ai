import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";

/** First member becomes the administrator; everyone else is a member. */
export const claimRoleIfFirst = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const user = await ctx.db.get(userId);
    if (!user || user.role) return;

    const anyMember = await ctx.db.query("users").first();
    const isFirstMember = anyMember?._id === userId;

    await ctx.db.patch(userId, {
      role: isFirstMember ? "admin" : "member",
    });
  },
});

/** Admin tool: promote or demote another member. */
export const setRole = mutation({
  args: { userId: v.id("users"), role: v.union(v.literal("admin"), v.literal("member")) },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Sign in first.");

    const caller = await ctx.db.get(callerId);
    if (caller?.role !== "admin") {
      throw new Error("This action is only available to administrators.");
    }

    await ctx.db.patch(args.userId, { role: args.role });
  },
});
