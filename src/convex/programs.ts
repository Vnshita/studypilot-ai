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
 * Public and idempotent: adds any catalog entry that is not yet present
 * (matched by title). Safe to call on every app start, and it is how new
 * courses reach deployments that were seeded with an earlier catalog.
 */
export const ensureSeeded = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("programs").collect();
    const knownTitles = new Set(existing.map((p) => p.title));

    let added = 0;
    for (const program of CATALOG) {
      if (knownTitles.has(program.title)) continue;
      await ctx.db.insert("programs", { ...program, status: "published" });
      added++;
    }

    return { added };
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

  // ---------------------------------------------------------------------------
  // Everyday programs — for people learning for life, not only for exams.
  // ---------------------------------------------------------------------------

  {
    title: "Public Speaking Without Fear",
    discipline: "Life Skills",
    level: "Beginner",
    priceCents: 24000,
    summary:
      "Eight weeks from sweaty palms to steady delivery, with a friendly room that wants you to succeed.",
    description:
      "Every session puts you on your feet for a short, low-stakes talk, then takes it apart kindly: where you rushed, what landed, and the one habit to work on next week. Along the way you build a toolkit that lasts — structuring a point, breathing through nerves, handling questions, and speaking to a room the way you speak to a friend. By the final session you will give a five-minute talk you are genuinely proud of.",
    instructor: "Samuel Okafor",
    sessionCount: 8,
    durationMinutes: 60,
    tags: ["speaking", "confidence", "presentations", "communication"],
  },
  {
    title: "Personal Finance, Practically",
    discipline: "Life Skills",
    level: "Beginner",
    priceCents: 26000,
    summary:
      "Budgets, debt, and compounding explained without jargon — and without anyone trying to sell you anything.",
    description:
      "This course covers the money decisions everyone actually faces: building a budget you will not abandon, understanding interest on both sides of the ledger, the mathematics of compounding, emergency funds, and the boring genius of index investing. Every session ends with one concrete action for your own accounts. No products, no affiliates — just arithmetic, calmly applied to your life.",
    instructor: "Ruth Adeyemi",
    sessionCount: 8,
    durationMinutes: 60,
    tags: ["finance", "budgeting", "investing", "everyday"],
  },
  {
    title: "Study Skills & Exam Calm",
    discipline: "Life Skills",
    level: "Beginner",
    priceCents: 18000,
    summary:
      "Learn how learning works: spaced repetition, retrieval practice, sleep, and walking into the hall steady.",
    description:
      "Built from the cognitive science of memory, this short course fixes the way most of us were never taught to study. You will set up a spaced-review system, practice retrieval instead of rereading, and learn why sleep is a study technique. The final session is devoted to exam-day craft: pacing, the first five minutes, and the breathing routine that keeps panic from making decisions for you.",
    instructor: "Ines Duarte",
    sessionCount: 6,
    durationMinutes: 60,
    tags: ["study skills", "memory", "exams", "wellbeing"],
  },
  {
    title: "Python from Zero",
    discipline: "Computer Science",
    level: "Beginner",
    priceCents: 32000,
    summary:
      "A patient first programming course for complete beginners — automate a chore by week three.",
    description:
      "Designed for people who have never written a line of code, this course starts with tiny scripts that do useful things — renaming files, tidying spreadsheets, sending yourself reminders — and builds steadily toward small complete programs. Every concept arrives through something you would genuinely want to make. Homework is real and short; the tutor reviews your code line by line.",
    instructor: "Prof. Adrian Kwei",
    sessionCount: 10,
    durationMinutes: 75,
    tags: ["python", "coding", "beginner", "automation"],
  },
  {
    title: "Everyday French Conversation",
    discipline: "Languages",
    level: "Beginner",
    priceCents: 28000,
    summary:
      "Order, ask, chat, and joke in French — a speaking-first course for travel, work, and the dinner table.",
    description:
      "Grammar serves conversation here, not the other way round. Each session is built around situations you will actually meet: the bakery, the train window seat, the awkward introduction at a colleague's dinner. Expect to speak French within the first ten minutes and every minute after that. Between sessions you keep a small voice diary your tutor listens to and answers each week.",
    instructor: "Ines Duarte",
    sessionCount: 12,
    durationMinutes: 60,
    tags: ["french", "conversation", "travel", "beginner"],
  },
  {
    title: "Digital Photography Foundations",
    discipline: "Art",
    level: "Beginner",
    priceCents: 30000,
    summary:
      "Light, composition, and the exposure triangle — take photographs you are proud to print.",
    description:
      "Whatever camera you own — phone included — this course teaches you to see before it teaches you to click. Weekly assignments on light, framing, and timing are reviewed in group critique, where you learn to talk about photographs and therefore to make them. Technical sessions cover exposure, focus, and editing with free software. The term ends with a small printed portfolio.",
    instructor: "Samuel Okafor",
    sessionCount: 8,
    durationMinutes: 75,
    tags: ["photography", "composition", "creative", "portfolios"],
  },
  {
    title: "Drawing for People Who Say They Can't",
    discipline: "Art",
    level: "Beginner",
    priceCents: 22000,
    summary:
      "Drawing is looking, and looking can be taught — a kind, structured start with pencil and paper.",
    description:
      "This course begins by dismantling the myth of talent. Through guided exercises — contour, negative space, value, gesture — you learn to see shapes the way artists do, and your hand follows. Sessions are short, weekly, and judgement-free; homework is fifteen minutes a day. Members routinely finish the term with drawings they cannot quite believe they made.",
    instructor: "Elena Vasquez",
    sessionCount: 8,
    durationMinutes: 60,
    tags: ["drawing", "sketching", "beginner", "creative"],
  },
  {
    title: "Music Theory from Scratch",
    discipline: "Music",
    level: "Beginner",
    priceCents: 26000,
    summary:
      "Why songs work: scales, chords, and the grammar of the music you already love.",
    description:
      "No instrument required and no notation-phobia welcome. Starting from the songs on your playlist, this course builds up scales, keys, and chords until the harmony you have always felt becomes something you can name and use. Weekly listening assignments train your ear; simple keyboard exercises make theory physical. By term's end you will analyse a song's chord progression and write one of your own.",
    instructor: "Elena Vasquez",
    sessionCount: 10,
    durationMinutes: 60,
    tags: ["music", "theory", "songwriting", "ear training"],
  },
  {
    title: "Spreadsheets for Real Work",
    discipline: "Business",
    level: "Beginner",
    priceCents: 24000,
    summary:
      "Formulas, lookups, and pivots for people whose job quietly runs on spreadsheets.",
    description:
      "Most working days are spent inside a spreadsheet nobody taught you to use properly. This course fixes that efficiently: clean data entry, the handful of formulas that do ninety percent of the work, lookups, pivot tables, and charts that tell the truth. Sessions use realistic files — budgets, rosters, sales lists — and each week ends with a shortcut that will save you hours.",
    instructor: "Ruth Adeyemi",
    sessionCount: 6,
    durationMinutes: 60,
    tags: ["spreadsheets", "excel", "data", "workplace"],
  },
  {
    title: "The Interview Studio",
    discipline: "Business",
    level: "Intermediate",
    priceCents: 20000,
    summary:
      "CVs, interviews, and salary conversations — rehearsed until they sound like you on a good day.",
    description:
      "Job hunting is a performance art, and performances improve with rehearsal. In this studio you rewrite your CV twice, answer the classic questions on camera, and review the tape with a coach who has sat on the other side of the table. The final session covers the conversation everyone dreads — salary — with scripts and numbers to back you up. Come with a real application in progress.",
    instructor: "Samuel Okafor",
    sessionCount: 4,
    durationMinutes: 75,
    tags: ["careers", "interviews", "cv", "negotiation"],
  },
  {
    title: "Nutrition, Minus the Noise",
    discipline: "Health",
    level: "Beginner",
    priceCents: 24000,
    summary:
      "What the evidence actually says about food — a calm course for chaotic weeks.",
    description:
      "Nutrition advice is loud, contradictory, and mostly selling something. This course reads the actual research with you: what protein really does, why fibre keeps coming up, how to read a study about diets, and which headlines deserve your scepticism. Every session translates the science into small, sustainable defaults for real weeks — deadlines, travel, and leftover pizza included.",
    instructor: "Ruth Adeyemi",
    sessionCount: 6,
    durationMinutes: 60,
    tags: ["nutrition", "health", "evidence", "everyday"],
  },
  {
    title: "The Habits Workshop",
    discipline: "Health",
    level: "Beginner",
    priceCents: 22000,
    summary:
      "Build routines that survive bad weeks — the psychology of habits, applied to yours.",
    description:
      "Motivation is a spark; habits are the wood stove. Working from behaviour science — cues, friction, identity, and streaks that forgive — this workshop helps each member design one small habit and one keystone routine, then stress-tests them across the term. You will learn why perfection is the enemy of consistency, and how to restart in ten minutes after the inevitable lapse.",
    instructor: "Hazel Marchetti",
    sessionCount: 8,
    durationMinutes: 60,
    tags: ["habits", "routines", "psychology", "wellbeing"],
  },
];
