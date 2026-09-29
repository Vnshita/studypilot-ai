import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const setStanding = mutation({
  args: { standing: v.union(v.literal("student"), v.literal("teacher")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in first.");

    await ctx.db.patch(userId, { standing: args.standing });
  },
});

export const setBio = mutation({
  args: { bio: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in first.");

    const bio = args.bio.trim();
    if (bio.length > 280) {
      throw new Error("Keep the bio under 280 characters.");
    }

    await ctx.db.patch(userId, { bio: bio || undefined });
  },
});
