import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listForProgram = query({
  args: { programId: v.id("programs") },
  handler: async (ctx, args) =>
    await ctx.db
      .query("notes")
      .withIndex("programId", (q) => q.eq("programId", args.programId))
      .order("desc")
      .collect(),
});

export const getById = query({
  args: { id: v.id("notes") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const listComments = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) =>
    await ctx.db
      .query("noteComments")
      .withIndex("noteId", (q) => q.eq("noteId", args.noteId))
      .collect(),
});

export const create = mutation({
  args: {
    programId: v.id("programs"),
    title: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in to publish study notes.");

    const title = args.title.trim();
    const body = args.body.trim();
    if (!title || !body) {
      throw new Error("Give your note a title and some content first.");
    }

    await ctx.db.insert("notes", { userId, ...args, title, body });
  },
});

export const remove = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in first.");

    const note = await ctx.db.get(args.id);
    if (!note) throw new Error("That note no longer exists.");
    if (note.userId !== userId) {
      throw new Error("You can only remove your own notes.");
    }

    const comments = await ctx.db
      .query("noteComments")
      .withIndex("noteId", (q) => q.eq("noteId", args.id))
      .collect();
    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }
    await ctx.db.delete(args.id);
  },
});

export const addComment = mutation({
  args: { noteId: v.id("notes"), body: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in to join the discussion.");

    const body = args.body.trim();
    if (!body) throw new Error("Write a reply before posting.");

    await ctx.db.insert("noteComments", { noteId: args.noteId, userId, body });
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => ctx.db.query("notes").order("desc").collect(),
});
