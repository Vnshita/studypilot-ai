import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

function sortedPair(a: Id<"users">, b: Id<"users">): [Id<"users">, Id<"users">] {
  return a < b ? [a, b] : [b, a];
}

/** Every conversation the current member participates in, newest activity last. */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const conversations = await ctx.db.query("conversations").collect();
    return conversations.filter((c) => c.participantIds.includes(userId));
  },
});

/** Other members, for starting a new conversation. */
export const listMembers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => u._id !== userId)
      .map((u) => ({ _id: u._id, name: u.name, email: u.email }));
  },
});

/** Find the conversation between the current member and another, or create it. */
export const getOrCreate = mutation({
  args: { otherUserId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in to message other members.");
    if (args.otherUserId === userId) {
      throw new Error("You cannot start a conversation with yourself.");
    }

    const key = sortedPair(userId, args.otherUserId);
    const existing = await ctx.db
      .query("conversations")
      .withIndex("byPair", (q) => q.eq("sortedParticipantIds", key))
      .first();
    if (existing) return existing._id;

    return await ctx.db.insert("conversations", {
      participantIds: [userId, args.otherUserId],
      sortedParticipantIds: key,
    });
  },
});

export const listMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in first.");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("That conversation no longer exists.");
    if (!conversation.participantIds.includes(userId)) {
      throw new Error("This conversation is private.");
    }

    return await ctx.db
      .query("messages")
      .withIndex("conversationId", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();
  },
});

export const send = mutation({
  args: { conversationId: v.id("conversations"), body: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in first.");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("That conversation no longer exists.");
    if (!conversation.participantIds.includes(userId)) {
      throw new Error("This conversation is private.");
    }

    const body = args.body.trim();
    if (!body) throw new Error("Write a message before sending.");

    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: userId,
      body,
    });
  },
});
