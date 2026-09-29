import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertAdmin } from "./adminGuards";

// ---------------------------------------------------------------------------
// Teacher applications — "which course do I want to teach"
// ---------------------------------------------------------------------------

/** Programs the current teacher could apply to lead (all published ones). */
export const listOpenPrograms = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("programs")
      .withIndex("status", (q) => q.eq("status", "published"))
      .collect();
  },
});

/** Programs the current teacher has been approved to lead. */
export const listMyAssignments = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("programs")
      .withIndex("status", (q) => q.eq("status", "published"))
      .filter((q) => q.eq(q.field("teacherId"), userId))
      .collect();
  },
});

export const applyToTeach = mutation({
  args: { programId: v.id("programs"), pitch: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in first.");

    const user = await ctx.db.get(userId);
    if (!user || user.standing !== "teacher") {
      throw new Error("Only members teaching at the house can apply.");
    }

    const pitch = args.pitch.trim();
    if (pitch.length < 20) {
      throw new Error(
        "Tell the registrar a little more — at least a sentence or two.",
      );
    }

    const program = await ctx.db.get(args.programId);
    if (!program) throw new Error("That program no longer exists.");
    if (program.teacherId) {
      throw new Error(
        `${program.title} already has a teacher. The registrar will know you are interested.`,
      );
    }

    await ctx.db.patch(args.programId, {
      pendingTeacherId: userId,
    });
  },
});

// ---------------------------------------------------------------------------
// Admin approval
// ---------------------------------------------------------------------------

export const listPendingApplications = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx);
    const programs = await ctx.db
      .query("programs")
      .filter((q) => q.neq(q.field("pendingTeacherId"), undefined))
      .collect();
    return programs;
  },
});

export const approveTeacher = mutation({
  args: {
    programId: v.id("programs"),
    teacherShareBps: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);

    const program = await ctx.db.get(args.programId);
    if (!program?.pendingTeacherId) {
      throw new Error("There is no pending application for this program.");
    }

    await ctx.db.patch(args.programId, {
      teacherId: program.pendingTeacherId,
      pendingTeacherId: undefined,
      teacherShareBps: args.teacherShareBps ?? 7000,
    });
  },
});

export const rejectApplication = mutation({
  args: { programId: v.id("programs") },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    await ctx.db.patch(args.programId, { pendingTeacherId: undefined });
  },
});

// ---------------------------------------------------------------------------
// Payouts — the teacher's ledger
// ---------------------------------------------------------------------------

/** Orders awaiting payment for the signed-in teacher. */
export const listMyEarnings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("orders")
      .withIndex("teacherId", (q) => q.eq("teacherId", userId))
      .filter((q) => q.eq(q.field("payoutStatus"), "due"))
      .collect();
  },
});

/** Everything the teacher has been paid out to date. */
export const listMyPaidOut = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("orders")
      .withIndex("teacherId", (q) => q.eq("teacherId", userId))
      .filter((q) => q.eq(q.field("payoutStatus"), "paid"))
      .collect();
  },
});

/** Admin: every payout due across all teachers. */
export const listDuePayouts = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx);
    const orders = await ctx.db.query("orders").collect();
    return orders.filter(
      (o) => o.status === "paid" && o.payoutStatus === "due" && o.teacherShareCents,
    );
  },
});

/**
 * Admin: mark a payout as sent. With Stripe Connect this becomes the webhook
 * confirmation of a `transfers` call; here it settles the ledger manually.
 */
export const markPayoutSent = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("That order no longer exists.");
    if (order.payoutStatus !== "due") {
      throw new Error("That payout has already been settled.");
    }

    await ctx.db.patch(args.orderId, { payoutStatus: "paid" });
  },
});
