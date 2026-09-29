import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { assertAdmin } from "./adminGuards";

export const getEnrollment = query({
  args: { programId: v.id("programs") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("enrollments")
      .withIndex("programId_userId", (q) =>
        q.eq("programId", args.programId).eq("userId", userId),
      )
      .first();
  },
});

export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("enrollments")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

/**
 * Simulated checkout: records a paid order for the card on file and grants
 * access. Swap for a real payment gateway by turning this into an action that
 * creates a payment intent, then granting enrollment from its webhook.
 */
export const checkout = mutation({
  args: {
    programId: v.id("programs"),
    cardNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("You must be signed in to check out.");

    const program = await ctx.db.get(args.programId);
    if (!program || program.status !== "published") {
      throw new Error("That program is no longer available.");
    }

    const existingEnrollment = await ctx.db
      .query("enrollments")
      .withIndex("programId_userId", (q) =>
        q.eq("programId", args.programId).eq("userId", userId),
      )
      .first();
    if (existingEnrollment) {
      throw new Error("You are already enrolled in this program.");
    }

    const digits = args.cardNumber.replace(/\D/g, "");
    if (digits.length < 12 || digits.length > 19) {
      throw new Error("Please enter a valid card number.");
    }

    await ctx.db.insert("orders", {
      userId,
      programId: args.programId,
      amountCents: program.priceCents,
      status: "paid",
      cardLast4: digits.slice(-4),
    });

    await ctx.db.insert("enrollments", { userId, programId: args.programId });
  },
});

export const listOrdersForUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("orders")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getOrder = query({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

// ---------------------------------------------------------------------------
// Admin views
// ---------------------------------------------------------------------------

export const listRecent = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx);
    return await ctx.db.query("orders").order("desc").take(25);
  },
});

export const refund = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);

    await ctx.db.patch(args.orderId, { status: "refunded" });

    const order = await ctx.db.get(args.orderId);
    if (order) {
      const enrollment = await ctx.db
        .query("enrollments")
        .withIndex("programId_userId", (q) =>
          q.eq("programId", order.programId).eq("userId", order.userId),
        )
        .first();
      if (enrollment) await ctx.db.delete(enrollment._id);
    }
  },
});

export const grantAccess = internalMutation({
  args: { userId: v.id("users"), programId: v.id("programs") },
  handler: async (ctx, args) => {
    await ctx.db.insert("enrollments", args);
  },
});
