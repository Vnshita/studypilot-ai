import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { ROLES } from "./schema";

// Shared validator for creating and editing programs.
const programValidator = {
  title: v.string(),
  discipline: v.string(),
  level: v.string(),
  priceCents: v.number(),
  summary: v.string(),
  description: v.string(),
  instructor: v.string(),
  sessionCount: v.number(),
  durationMinutes: v.number(),
  tags: v.array(v.string()),
  status: v.union(v.literal("published"), v.literal("draft")),
};

// ---------------------------------------------------------------------------
// Catalog queries
// ---------------------------------------------------------------------------

export const listPublished = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const programs = await ctx.db
      .query("programs")
      .withIndex("status", (q) => q.eq("status", "published"))
      .collect();

    const raw = args.search?.trim().toLowerCase();
    if (!raw) return programs;

    const terms = raw.split(/\s+/);
    return programs.filter((p) => {
      const haystack = [
        p.title,
        p.discipline,
        p.level,
        p.instructor,
        p.summary,
        ...p.tags,
      ]
        .join(" ")
        .toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  },
});

export const listDisciplines = query({
  args: {},
  handler: async (ctx) => {
    const programs = await ctx.db
      .query("programs")
      .withIndex("status", (q) => q.eq("status", "published"))
      .collect();
    return Array.from(new Set(programs.map((p) => p.discipline))).sort();
  },
});

export const getById = query({
  args: { id: v.id("programs") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

// ---------------------------------------------------------------------------
// Admin queries and mutations
// ---------------------------------------------------------------------------

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentAdmin(ctx);
    if (!user) return null;
    return await ctx.db.query("programs").collect();
  },
});

export const create = mutation({
  args: programValidator,
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    return ctx.db.insert("programs", { ...args, status: args.status });
  },
});

export const update = mutation({
  args: { id: v.id("programs"), patch: v.object(programValidator) },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    await ctx.db.patch(args.id, args.patch);
  },
});

export const remove = mutation({
  args: { id: v.id("programs") },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

/**
 * Public but idempotent: fills the catalog once when the table is still empty.
 * Safe to call from the client on app start.
 */
export const ensureSeeded = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("programs").first();
    if (existing) return;

    for (const program of CATALOG) {
      await ctx.db.insert("programs", { ...program, status: "published" });
    }
  },
});

// ---------------------------------------------------------------------------
// Admin guard
// ---------------------------------------------------------------------------

async function getCurrentAdmin(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  const user = await ctx.db.get(userId);
  return user?.role === ROLES.ADMIN ? user : null;
}

async function assertAdmin(ctx: QueryCtx) {
  const admin = await getCurrentAdmin(ctx);
  if (!admin) {
    throw new Error("This action is only available to administrators.");
  }
}

const CATALOG: Array<{
  title: string;
  discipline: string;
  level: string;
  priceCents: number;
  summary: string;
  description: string;
  instructor: string;
  sessionCount: number;
  durationMinutes: number;
  tags: string[];
}> = [
  {
    title: "Advanced Proof Techniques",
    discipline: "Mathematics",
    level: "Advanced",
    priceCents: 48000,
    summary:
      "A twelve-week practicum on proof craft: construction, contradiction, and the disciplined skepticism in between.",
    description:
      "Weekly problem sets with written instructor feedback form the core of this practicum. Each session pairs a short lecture on technique with a seminar-style dissection of famous proofs, and participants leave with a personal archive of solutions they have argued through — not memorized. Enrollment includes two private review sessions with your tutor.",
    instructor: "Dr. Margot Ellery",
    sessionCount: 12,
    durationMinutes: 75,
    tags: ["proof writing", "mathematics", "seminar", "problem sets"],
  },
  {
    title: "Classical Mechanics Refound",
    discipline: "Physics",
    level: "Intermediate",
    priceCents: 42000,
    summary:
      "Rebuild mechanics from first principles with weekly problem sprints and one-on-one tutoring checkpoints.",
    description:
      "This course treats Newtonian mechanics as something to be rebuilt, not remembered. Fortnightly problem sprints are debriefed in small groups, and the mathematical scaffolding — Lagrangians, variational principles, conservation laws — is introduced the moment it becomes useful rather than in an abstract preamble. Includes fortnightly office hours and a structured revision plan for examinations.",
    instructor: "Prof. Adrian Kwei",
    sessionCount: 10,
    durationMinutes: 90,
    tags: ["physics", "mechanics", "problem solving", "exam prep"],
  },
  {
    title: "The Long Essay",
    discipline: "Writing",
    level: "Intermediate",
    priceCents: 36000,
    summary:
      "An eight-week atelier for writers assembling a substantial essay or extended dissertation chapter.",
    description:
      "Designed for researchers and students producing long-form work, this atelier moves through argument architecture, evidence discipline, and sentence-level revision. Each member submits two substantial drafts over the course and receives line-by-line commentary in workshop. The final session covers rhythm, restraint, and the quiet arts of the conclusion.",
    instructor: "Hazel Marchetti",
    sessionCount: 8,
    durationMinutes: 60,
    tags: ["writing", "essay", "dissertation", "workshop"],
  },
  {
    title: "Organic Reaction Logic",
    discipline: "Chemistry",
    level: "Advanced",
    priceCents: 52000,
    summary:
      "Master mechanistic reasoning with graded synthesis challenges and fortnightly lab-review seminars.",
    description:
      "Rather than cataloguing reactions, this program teaches the reasoning that predicts them: electronic effects, stereochemical constraints, and kinetic versus thermodynamic control. Graded synthesis challenges escalate across the term, and the fortnightly seminars review the reasoning behind each answer in detail. Suitable for students preparing for advanced examinations or research rotations.",
    instructor: "Dr. Priya Raghavan",
    sessionCount: 14,
    durationMinutes: 75,
    tags: ["chemistry", "synthesis", "mechanisms", "research"],
  },
  {
    title: "Latinate Foundations",
    discipline: "Languages",
    level: "Beginner",
    priceCents: 28000,
    summary:
      "A patient, grammar-first introduction to Latin for readers who want unmediated access to primary texts.",
    description:
      "This course assumes genuine curiosity but no prior Latin. Grammar is introduced deliberately and drilled through adapted readings that quickly give way to unadapted passages — Catullus, Caesar, and the Vulgate. Weekly reading circles keep the emphasis on translation as an act of reading rather than puzzle-solving. Ideal preparation for classical reading lists in graduate study.",
    instructor: "Ines Duarte",
    sessionCount: 12,
    durationMinutes: 60,
    tags: ["latin", "languages", "beginner", "reading"],
  },
  {
    title: "Statistical Judgment",
    discipline: "Mathematics",
    level: "Intermediate",
    priceCents: 44000,
    summary:
      "From estimation to inference: a statistics program focused on judgment, not just computation.",
    description:
      "Half mathematics, half philosophy of evidence. The computational spine covers estimation, hypothesis testing, and regression, while the weekly seminars interrogate how these tools are used — and misused — in published research. Case studies are drawn from medicine, economics, and social science, and each participant completes a short independent analysis with tutor supervision.",
    instructor: "Dr. Margot Ellery",
    sessionCount: 10,
    durationMinutes: 75,
    tags: ["statistics", "inference", "regression", "research"],
  },
  {
    title: "Algorithmic Thinking Studio",
    discipline: "Computer Science",
    level: "Intermediate",
    priceCents: 46000,
    summary:
      "A studio course on algorithms where every problem is defended aloud before it is coded.",
    description:
      "The studio format is simple: problems are attempted independently, then defended aloud in small groups before any code is written. Topics span complexity analysis, dynamic programming, graph algorithms, and amortized arguments. The aim is fluency — the ability to reason about a novel problem calmly and in public, which is precisely what interviews and examinations reward.",
    instructor: "Prof. Adrian Kwei",
    sessionCount: 10,
    durationMinutes: 90,
    tags: ["algorithms", "computer science", "interviews", "problem sets"],
  },
  {
    title: "Close Reading Clinic",
    discipline: "Writing",
    level: "Advanced",
    priceCents: 32000,
    summary:
      "Fortnightly seminars in the discipline of reading slowly: argument, tone, and the evidence of the page.",
    description:
      "This clinic trains the habits that make literary and philosophical study possible: close attention to syntax, sensitivity to register, and the patience to sit with a difficult passage. Texts are drawn from across the tradition — Austen, Woolf, Nietzsche, and a rotating contemporary selection — and each fortnight one member leads the seminar. Recommended for humanities students preparing for tutorial-style study.",
    instructor: "Hazel Marchetti",
    sessionCount: 6,
    durationMinutes: 90,
    tags: ["literature", "close reading", "humanities", "seminar"],
  },
];
