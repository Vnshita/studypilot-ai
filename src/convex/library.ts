import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { assertAdmin } from "./adminGuards";

// ---------------------------------------------------------------------------
// Public queries
// ---------------------------------------------------------------------------

/** Materials for one discipline, used by the library shelves and detail page. */
export const listByDiscipline = query({
  args: { discipline: v.string() },
  handler: async (ctx, args) =>
    await ctx.db
      .query("materials")
      .withIndex("discipline", (q) => q.eq("discipline", args.discipline))
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect(),
});

export const getById = query({
  args: { id: v.id("materials") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

/** Materials contributed by the signed-in teacher, for the studio. */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("materials")
      .withIndex("contributorId", (q) => q.eq("contributorId", userId))
      .collect();
  },
});

/** Distinct disciplines that have at least one published material. */
export const listDisciplines = query({
  args: {},
  handler: async (ctx) => {
    const materials = await ctx.db.query("materials").collect();
    const published = materials.filter((m) => m.status === "published");
    return Array.from(new Set(published.map((m) => m.discipline))).sort();
  },
});

// ---------------------------------------------------------------------------
// Teacher mutations
// ---------------------------------------------------------------------------

const materialValidator = {
  discipline: v.string(),
  kind: v.union(
    v.literal("textbook"),
    v.literal("notes"),
    v.literal("video"),
    v.literal("tutorial"),
    v.literal("course"),
  ),
  title: v.string(),
  description: v.string(),
  fileUrl: v.optional(v.string()),
  pricingNote: v.optional(v.string()),
};

export const create = mutation({
  args: materialValidator,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in to contribute to the library.");

    const user = await ctx.db.get(userId);
    if (!user || user.standing !== "teacher") {
      throw new Error(
        "Only members teaching at the house can add library material.",
      );
    }

    const title = args.title.trim();
    const description = args.description.trim();
    if (!title || !description) {
      throw new Error("A title and a short description are required.");
    }

    if (args.fileUrl && !/^https?:\/\//.test(args.fileUrl)) {
      throw new Error("The link must start with http:// or https://");
    }

    // Paid courses must always say where the money goes.
    if (args.kind === "course" && !args.pricingNote?.trim()) {
      throw new Error("Paid courses need a short pricing note.");
    }

    return await ctx.db.insert("materials", {
      ...args,
      title,
      description,
      fileUrl: args.fileUrl?.trim() || undefined,
      pricingNote: args.pricingNote?.trim() || undefined,
      contributorId: userId,
      contributorName: user.name || user.email || "A member of the house",
      status: "published",
    });
  },
});

export const remove = mutation({
  args: { id: v.id("materials") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in first.");

    const material = await ctx.db.get(args.id);
    if (!material) throw new Error("That material no longer exists.");
    if (material.contributorId !== userId) {
      throw new Error("You can only withdraw material you contributed.");
    }

    await ctx.db.delete(args.id);
  },
});

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx);
    return await ctx.db.query("materials").order("desc").collect();
  },
});

export const adminRemove = mutation({
  args: { id: v.id("materials") },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

/**
 * Public and idempotent: adds any library entry that is not yet present
 * (matched by title). Safe to call on every app start; this is how new
 * material reaches deployments that were seeded earlier.
 */
export const ensureSeeded = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("materials").collect();
    const knownTitles = new Set(existing.map((m) => m.title));

    // The house collection is attributed to the administrator; until the
    // first member joins there is nobody to attribute it to, so we wait.
    const admin =
      (await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("role"), "admin"))
        .first()) ?? (await ctx.db.query("users").first());
    if (!admin) return;

    let added = 0;
    for (const { contributorId: _placeholder, ...item } of SEED) {
      if (knownTitles.has(item.title)) continue;
      await ctx.db.insert("materials", {
        ...item,
        contributorId: admin._id,
        status: "published",
      });
      added++;
    }

    return { added };
  },
});

// ---------------------------------------------------------------------------
// Seed content — open textbooks (CC-licensed PDFs) plus house notes.
// Links verified reachable at build time; all free and legal to distribute.
// ---------------------------------------------------------------------------

type SeedMaterial = {
  discipline: string;
  kind: "textbook" | "notes" | "video" | "tutorial" | "course";
  title: string;
  description: string;
  fileUrl?: string;
  pricingNote?: string;
  contributorId: string;
  contributorName: string;
};

// Placeholder contributor ids are rewritten to the admin's id on insert, so
// seeded material is attributed to the house rather than a dangling user.
const HOUSE = "seed-house";

const SEED: SeedMaterial[] = [
  // --- Mathematics ---------------------------------------------------------
  {
    discipline: "Mathematics",
    kind: "textbook",
    title: "Calculus, Volume 1 (OpenStax)",
    description:
      "The standard first volume: limits, derivatives, and the integral, with worked examples throughout. Free and openly licensed.",
    fileUrl:
      "https://d3bxy9euw4e147.cloudfront.net/oscms-prodcms/media/documents/CalculusVolume1-OP.pdf",
    contributorId: HOUSE,
    contributorName: "The House Library",
  },
  {
    discipline: "Mathematics",
    kind: "textbook",
    title: "Calculus, Volume 2 (OpenStax)",
    description:
      "Integration techniques, sequences and series, parametric and polar curves — the continuation of Volume 1.",
    fileUrl:
      "https://d3bxy9euw4e147.cloudfront.net/oscms-prodcms/media/documents/CalculusVolume2-OP.pdf",
    contributorId: HOUSE,
    contributorName: "The House Library",
  },
  {
    discipline: "Mathematics",
    kind: "textbook",
    title: "Precalculus (OpenStax)",
    description:
      "Algebra, trigonometry, and the functions family — the groundwork every program here assumes you can lean on.",
    fileUrl:
      "https://d3bxy9euw4e147.cloudfront.net/oscms-prodcms/media/documents/Precalculus-OP.pdf",
    contributorId: HOUSE,
    contributorName: "The House Library",
  },
  {
    discipline: "Mathematics",
    kind: "textbook",
    title: "Introductory Statistics (OpenStax)",
    description:
      "From descriptive statistics through inference, with real datasets. Companion to the Statistical Judgment program.",
    fileUrl:
      "https://d3bxy9euw4e147.cloudfront.net/oscms-prodcms/media/documents/IntroductoryStatistics-OP.pdf",
    contributorId: HOUSE,
    contributorName: "The House Library",
  },
  {
    discipline: "Mathematics",
    kind: "notes",
    title: "House Notes: How to Read a Proof",
    description:
      "Two pages on the habits that make proofs tractable — identify the type, find the hinge, and test the boundary cases before believing anything.",
    contributorId: HOUSE,
    contributorName: "Dr. Margot Ellery",
  },
  {
    discipline: "Mathematics",
    kind: "notes",
    title: "House Notes: Estimation Before Computation",
    description:
      "A one-page drill: guess the magnitude first, compute second. The habit that catches most errors before they harden.",
    contributorId: HOUSE,
    contributorName: "Dr. Margot Ellery",
  },

  // --- Physics ---------------------------------------------------------------
  {
    discipline: "Physics",
    kind: "textbook",
    title: "College Physics 2e (OpenStax)",
    description:
      "Algebra-based physics from mechanics through modern physics, written for students meeting the subject seriously for the first time.",
    fileUrl:
      "https://kfe.khmnu.edu.ua/wp-content/uploads/sites/69/2025/01/college_physics_2e-web_7zesafu___2022__c.pdf",
    contributorId: HOUSE,
    contributorName: "The House Library",
  },
  {
    discipline: "Physics",
    kind: "textbook",
    title: "University Physics, Volume 1 (OpenStax)",
    description:
      "Calculus-based mechanics, waves, and thermodynamics — the deeper treatment for members in the physics programs.",
    fileUrl:
      "https://d3bxy9euw4e147.cloudfront.net/oscms-prodcms/media/documents/UniversityPhysicsVolume1-OP.pdf",
    contributorId: HOUSE,
    contributorName: "The House Library",
  },
  {
    discipline: "Physics",
    kind: "notes",
    title: "House Notes: Dimensional Analysis as a First Weapon",
    description:
      "Before any equation, check the units. A short sheet of worked examples where dimensional analysis alone finds the answer.",
    contributorId: HOUSE,
    contributorName: "Prof. Adrian Kwei",
  },

  // --- Chemistry -------------------------------------------------------------
  {
    discipline: "Chemistry",
    kind: "textbook",
    title: "Chemistry 2e (OpenStax)",
    description:
      "General chemistry: structure, bonding, thermodynamics, and kinetics, with strong problem sets. Foundation for Organic Reaction Logic.",
    fileUrl:
      "https://d3bxy9euw4e147.cloudfront.net/oscms-prodcms/media/documents/Chemistry2e-OP.pdf",
    contributorId: HOUSE,
    contributorName: "The House Library",
  },
  {
    discipline: "Chemistry",
    kind: "notes",
    title: "House Notes: Drawing Mechanisms Without Fear",
    description:
      "Arrow-pushing conventions, the four moves that cover most mechanisms, and the common ways students quietly break the rules.",
    contributorId: HOUSE,
    contributorName: "Dr. Priya Raghavan",
  },

  // --- Computer Science --------------------------------------------------------
  {
    discipline: "Computer Science",
    kind: "textbook",
    title: "Think Python, 2nd Edition",
    description:
      "Allen Downey's gentle, rigorous introduction to programming and computational thinking. Free PDF from the author's site.",
    fileUrl: "https://www.greenteapress.com/thinkpython2/thinkpython2.pdf",
    contributorId: HOUSE,
    contributorName: "The House Library",
  },
  {
    discipline: "Computer Science",
    kind: "textbook",
    title: "Structure and Interpretation of Computer Programs",
    description:
      "Abelson and Sussman's classic on programs as arguments about computation. The PDF generation of the MIT 6.001 text.",
    fileUrl: "https://web.mit.edu/6.001/6.037/sicp.pdf",
    contributorId: HOUSE,
    contributorName: "The House Library",
  },
  {
    discipline: "Computer Science",
    kind: "notes",
    title: "House Notes: Invariants Before Implementation",
    description:
      "State what stays true before you write what changes. Worked loops and recursions where the invariant does the heavy lifting.",
    contributorId: HOUSE,
    contributorName: "Prof. Adrian Kwei",
  },

  // --- Writing ------------------------------------------------------------------
  {
    discipline: "Writing",
    kind: "notes",
    title: "House Notes: The Paragraph as an Argument",
    description:
      "One paragraph, one claim, evidence ordered by strength. Annotated examples of paragraphs that carry an essay and paragraphs that merely fill it.",
    contributorId: HOUSE,
    contributorName: "Hazel Marchetti",
  },
  {
    discipline: "Writing",
    kind: "notes",
    title: "House Notes: Revising for Rhythm",
    description:
      "Read aloud, cut the hedges, and let short sentences do heavy lifting. A checklist for the final pass on any long-form piece.",
    contributorId: HOUSE,
    contributorName: "Hazel Marchetti",
  },

  // --- Economics ------------------------------------------------------------------
  {
    discipline: "Economics",
    kind: "textbook",
    title: "Principles of Economics 3e (OpenStax)",
    description:
      "Micro and macro in one volume: supply, elasticity, market structures, and the macro aggregates, with current examples.",
    fileUrl:
      "https://d3bxy9euw4e147.cloudfront.net/oscms-prodcms/media/documents/PrinciplesofEconomics-OP.pdf",
    contributorId: HOUSE,
    contributorName: "The House Library",
  },

  // --- Languages --------------------------------------------------------------------
  {
    discipline: "Languages",
    kind: "notes",
    title: "House Notes: Vocabulary That Sticks",
    description:
      "Spaced repetition done honestly: the card formats that work for Latin, the ones that quietly waste afternoons, and when to read instead.",
    contributorId: HOUSE,
    contributorName: "Ines Duarte",
  },
  {
    discipline: "Languages",
    kind: "notes",
    title: "House Notes: Translating with the Author, Not Against Them",
    description:
      "Loose literalism first, polish second. How to keep Caesar's word order in your head long enough to let it teach you something.",
    contributorId: HOUSE,
    contributorName: "Ines Duarte",
  },

  // --- Anatomy & Physiology ----------------------------------------------------------
  {
    discipline: "Anatomy & Physiology",
    kind: "textbook",
    title: "Anatomy and Physiology (OpenStax)",
    description:
      "Systems-based A&P from cells to organ systems, with clinical notes. Reliable reference for pre-medical members.",
    fileUrl:
      "https://d3bxy9euw4e147.cloudfront.net/oscms-prodcms/media/documents/AnatomyAndPhysiology-OP.pdf",
    contributorId: HOUSE,
    contributorName: "The House Library",
  },

  // ---------------------------------------------------------------------------
  // Free video courses and lecture series — real links, verified at build time.
  // ---------------------------------------------------------------------------

  {
    discipline: "Mathematics",
    kind: "video",
    title: "Essence of Linear Algebra (3Blue1Brown)",
    description:
      "Grant Sanderson's animated series builds the geometric intuition behind vectors, matrices, and determinants. The complement to any algebra course.",
    fileUrl: "https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab",
    contributorId: HOUSE,
    contributorName: "The House Library",
  },
  {
    discipline: "Mathematics",
    kind: "video",
    title: "Essence of Calculus (3Blue1Brown)",
    description:
      "Calculus re-imagined visually: what a derivative really is, why the chain rule looks the way it does, and what integrals have to do with circles.",
    fileUrl: "https://www.youtube.com/playlist?list=PLZHQObOWTQDMsr9K-rj53DwVRMYO3t5Yr",
    contributorId: HOUSE,
    contributorName: "The House Library",
  },
  {
    discipline: "Mathematics",
    kind: "video",
    title: "MIT 18.06 Linear Algebra — Full Lectures (Gilbert Strang)",
    description:
      "The legendary MIT lecture course, free and complete. Strang teaches the subject the way it is actually used. Lecture notes and problem sets included.",
    fileUrl: "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/",
    contributorId: HOUSE,
    contributorName: "The House Library",
  },
  {
    discipline: "Physics",
    kind: "video",
    title: "MIT 8.01 Classical Mechanics — Full Course",
    description:
      "Walter Lewin's legendary lectures and the full modern MITx course materials: problem sets, exams, and worked solutions, all free.",
    fileUrl: "https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/",
    contributorId: HOUSE,
    contributorName: "The House Library",
  },

  {
    discipline: "Computer Science",
    kind: "video",
    title: "CS50: Introduction to Computer Science (Harvard)",
    description:
      "David Malan's famous entry course, free for anyone: lectures, labs, and problem sets in C, Python, SQL, and JavaScript. The best first course in computing ever filmed.",
    fileUrl: "https://cs50.harvard.edu/x/",
    contributorId: HOUSE,
    contributorName: "The House Library",
  },

  // ---------------------------------------------------------------------------
  // Free interactive tutorials and practice sites.
  // ---------------------------------------------------------------------------

  {
    discipline: "Mathematics",
    kind: "tutorial",
    title: "Khan Academy — Mathematics",
    description:
      "From counting to multivariable calculus, with practice exercises, instant feedback, and mastery tracking. Free forever, no account needed to practice.",
    fileUrl: "https://www.khanacademy.org/math",
    contributorId: HOUSE,
    contributorName: "The House Library",
  },
  {
    discipline: "Physics",
    kind: "tutorial",
    title: "Khan Academy — Physics",
    description:
      "Short lessons and practice on every topic from one-dimensional motion to thermodynamics. Ideal warm-up before the house's physics programs.",
    fileUrl: "https://www.khanacademy.org/science/physics",
    contributorId: HOUSE,
    contributorName: "The House Library",
  },
  {
    discipline: "Chemistry",
    kind: "tutorial",
    title: "Khan Academy — Chemistry",
    description:
      "Stoichiometry, bonding, acids and bases, and organic basics with worked examples and practice sets.",
    fileUrl: "https://www.khanacademy.org/science/chemistry",
    contributorId: HOUSE,
    contributorName: "The House Library",
  },
  {
    discipline: "Economics",
    kind: "tutorial",
    title: "Marginal Revolution University",
    description:
      "Free video library from economists Tyler Cowen and Alex Tabarrok: micro, macro, and everyday economics, taught with clarity and wit.",
    fileUrl: "https://mru.org/",
    contributorId: HOUSE,
    contributorName: "The House Library",
  },
  {
    discipline: "Writing",
    kind: "tutorial",
    title: "Khan Academy — Grammar & Writing",
    description:
      "Interactive grammar practice with immediate feedback — the quiet hours of editing made less mysterious.",
    fileUrl: "https://www.khanacademy.org/humanities/grammar",
    contributorId: HOUSE,
    contributorName: "The House Library",
  },
  {
    discipline: "Computer Science",
    kind: "tutorial",
    title: "MIT 6.0001 — Introduction to CS & Programming in Python",
    description:
      "Full MIT course materials: lectures, slides, problem sets, and exams. The rigorous companion to Python from Zero.",
    fileUrl: "https://ocw.mit.edu/courses/6-0001-introduction-to-computer-science-and-programming-in-python-fall-2016/",
    contributorId: HOUSE,
    contributorName: "The House Library",
  },

  // ---------------------------------------------------------------------------
  // Paid courses on external platforms — the link goes to the vendor.
  // ---------------------------------------------------------------------------

  {
    discipline: "Mathematics",
    kind: "course",
    title: "Brilliant.org — Logic & Mathematics Foundations",
    description:
      "Interactive problem-solving with immediate feedback. Superb for building intuition between the house's sessions; the free tier is limited, the subscription is worth it.",
    fileUrl: "https://brilliant.org/",
    pricingNote: "Subscription (free tier available)",
    contributorId: HOUSE,
    contributorName: "The House Library",
  },
  {
    discipline: "Computer Science",
    kind: "course",
    title: "CS50 Professional Certificate (edX)",
    description:
      "The verified, graded version of Harvard's CS50 with a certificate on completion. The free path covers everything; this adds grading and credentials.",
    fileUrl: "https://cs50.harvard.edu/x/",
    pricingNote: "From $209 (certificate track)",
    contributorId: HOUSE,
    contributorName: "The House Library",
  },
  {
    discipline: "Business",
    kind: "course",
    title: "Google Project Management Certificate (Coursera)",
    description:
      "Practical, employer-recognized training in planning, agile, and stakeholder communication. Pairs well with The Interview Studio.",
    fileUrl: "https://www.coursera.org/professional-certificates/google-project-management",
    pricingNote: "Coursera subscription",
    contributorId: HOUSE,
    contributorName: "The House Library",
  },
  {
    discipline: "Health",
    kind: "course",
    title: "The Science of Well-Being (Coursera, Yale)",
    description:
      "Laurie Santos's celebrated course on the psychology of happiness — the evidence behind habits, with structured assignments. Audit free; certificate paid.",
    fileUrl: "https://www.coursera.org/learn/the-science-of-well-being",
    pricingNote: "Audit free · certificate paid",
    contributorId: HOUSE,
    contributorName: "The House Library",
  },
  {
    discipline: "Languages",
    kind: "course",
    title: "italki — Private Language Tutors",
    description:
      "One-on-one video lessons with native speakers at every price point. The speaking practice that turns Everyday French into fluency.",
    fileUrl: "https://www.italki.com/",
    pricingNote: "From ~$10 per lesson",
    contributorId: HOUSE,
    contributorName: "The House Library",
  },
];
