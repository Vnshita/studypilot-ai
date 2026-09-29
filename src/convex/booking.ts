import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const TUTORS = [
  "Dr. Margot Ellery",
  "Prof. Adrian Kwei",
  "Hazel Marchetti",
  "Dr. Priya Raghavan",
  "Ines Duarte",
] as const;

export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("bookings")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => ctx.db.query("bookings").order("desc").collect(),
});

export const book = mutation({
  args: {
    tutorName: v.string(),
    topic: v.string(),
    startsAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in to reserve a session.");

    const topic = args.topic.trim();
    if (!topic) throw new Error("Tell your tutor what you would like to cover.");

    if (args.startsAt <= Date.now()) {
      throw new Error("Choose a time in the future.");
    }

    // Keep the calendar honest: one booking per tutor per start time.
    const existing = await ctx.db
      .query("bookings")
      .filter((q) =>
        q.and(
          q.eq(q.field("tutorName"), args.tutorName),
          q.eq(q.field("startsAt"), args.startsAt),
          q.eq(q.field("status"), "upcoming"),
        ),
      )
      .first();
    if (existing) {
      throw new Error("That time has just been taken. Please pick another.");
    }

    await ctx.db.insert("bookings", {
      userId,
      tutorName: args.tutorName,
      topic,
      startsAt: args.startsAt,
      status: "upcoming",
    });
  },
});

export const cancel = mutation({
  args: { id: v.id("bookings") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in first.");

    const booking = await ctx.db.get(args.id);
    if (!booking) throw new Error("That booking no longer exists.");
    if (booking.userId !== userId) {
      throw new Error("You can only cancel your own sessions.");
    }

    await ctx.db.patch(args.id, { status: "cancelled" });
  },
});
