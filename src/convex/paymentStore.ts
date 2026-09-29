/**
 * Database helpers for the Stripe payment flow (default runtime).
 *
 * Kept separate from payments.ts because Convex "use node" modules may only
 * contain actions; the actions in payments.ts call these internal functions
 * for every database read/write.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ROLES } from "./schema";

export const userEmail = internalQuery({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    return { email: user?.email };
  },
});

export const callerIsAdmin = internalQuery({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const user = await ctx.db.get(userId);
    return user?.role === ROLES.ADMIN;
  },
});

export const programSnapshot = internalQuery({
  args: { programId: v.id("programs"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const program = await ctx.db.get(args.programId);
    if (!program || program.status !== "published") return null;

    const alreadyEnrolled = !!(await ctx.db
      .query("enrollments")
      .withIndex("programId_userId", (q) =>
        q.eq("programId", args.programId).eq("userId", args.userId),
      )
      .first());

    return {
      title: program.title,
      discipline: program.discipline,
      level: program.level,
      instructor: program.instructor,
      sessionCount: program.sessionCount,
      priceCents: program.priceCents,
      teacherId: program.teacherId,
      teacherShareCents: program.teacherId
        ? Math.round(
            (program.priceCents * (program.teacherShareBps ?? 7000)) / 10000,
          )
        : undefined,
      alreadyEnrolled,
    };
  },
});

export const insertPendingOrder = internalMutation({
  args: {
    userId: v.id("users"),
    programId: v.id("programs"),
    amountCents: v.number(),
    teacherId: v.optional(v.id("users")),
    teacherShareCents: v.optional(v.number()),
    stripeSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("orders", {
      userId: args.userId,
      programId: args.programId,
      amountCents: args.amountCents,
      status: "pending",
      teacherId: args.teacherId,
      teacherShareCents: args.teacherShareCents,
      payoutStatus: args.teacherId ? "due" : undefined,
      stripeSessionId: args.stripeSessionId,
    });
  },
});

export const orderBySession = internalQuery({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("stripeSessionId", (q) => q.eq("stripeSessionId", args.sessionId))
      .first();
  },
});

export const orderById = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.orderId);
  },
});

/** Idempotent settlement: mark paid and grant the enrollment exactly once. */
export const settleOrder = internalMutation({
  args: {
    orderId: v.id("orders"),
    paymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return;

    if (order.status !== "paid") {
      await ctx.db.patch(args.orderId, {
        status: "paid",
        stripePaymentIntentId: args.paymentIntentId,
      });
    }

    const existing = await ctx.db
      .query("enrollments")
      .withIndex("programId_userId", (q) =>
        q.eq("programId", order.programId).eq("userId", order.userId),
      )
      .first();
    if (!existing) {
      await ctx.db.insert("enrollments", {
        userId: order.userId,
        programId: order.programId,
      });
    }
  },
});

export const completeRefund = internalMutation({
  args: {
    orderId: v.id("orders"),
    refundAmountCents: v.number(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return;

    await ctx.db.patch(args.orderId, {
      status: "refunded",
      refundAmountCents: args.refundAmountCents,
    });

    const enrollment = await ctx.db
      .query("enrollments")
      .withIndex("programId_userId", (q) =>
        q.eq("programId", order.programId).eq("userId", order.userId),
      )
      .first();
    if (enrollment) await ctx.db.delete(enrollment._id);
  },
});

/** Stripe-side status of a checkout session, for the return page. */
export const getCheckoutStatus = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { status: "pending" as const };

    const order = await ctx.db
      .query("orders")
      .withIndex("stripeSessionId", (q) => q.eq("stripeSessionId", args.sessionId))
      .first();

    // Only the paying member (or an admin) may poll a session.
    if (order && order.userId !== userId) {
      const user = await ctx.db.get(userId);
      if (user?.role !== ROLES.ADMIN) return { status: "pending" as const };
    }

    return { status: order?.status ?? ("pending" as const) };
  },
});
