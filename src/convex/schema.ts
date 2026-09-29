import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

export const programStatus = v.union(
  v.literal("published"),
  v.literal("draft"),
);

export const orderStatus = v.union(
  v.literal("pending"), // checkout session opened, awaiting Stripe confirmation
  v.literal("paid"),
  v.literal("refunded"),
);

export const bookingStatus = v.union(
  v.literal("upcoming"),
  v.literal("cancelled"),
);

export const payoutStatus = v.union(
  v.literal("due"),
  v.literal("paid"),
);

export const memberStanding = v.union(
  v.literal("student"),
  v.literal("teacher"),
);

export const materialKind = v.union(
  v.literal("textbook"), // free PDF, opens in a new window
  v.literal("notes"), // house-written notes, read in place
  v.literal("video"), // free video course or lecture series
  v.literal("tutorial"), // free interactive tutorial or practice site
  v.literal("course"), // paid course on an external platform
);

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove

      // How the member takes part in the house: learning, teaching, or both.
      standing: v.optional(memberStanding),

      // Short bio shown beside materials a teacher contributes.
      bio: v.optional(v.string()),
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // add other tables here

    // Private study programs — the item catalog.
    programs: defineTable({
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
      status: programStatus,

      // Teaching assignment and pay split. teacherShareBps is basis points
      // of the program price paid to the assigned teacher (default 70%).
      teacherId: v.optional(v.id("users")),
      pendingTeacherId: v.optional(v.id("users")), // application awaiting approval
      teacherShareBps: v.optional(v.number()),
    })
      .index("discipline", ["discipline"])
      .index("status", ["status"]),

    // Checkout records for program purchases.
    orders: defineTable({
      userId: v.id("users"),
      programId: v.id("programs"),
      amountCents: v.number(),
      status: orderStatus,
      // Simulated orders store the card's last 4; Stripe orders leave it unset.
      cardLast4: v.optional(v.string()),

      // Stripe checkout session and, once confirmed, the payment intent.
      stripeSessionId: v.optional(v.string()),
      stripePaymentIntentId: v.optional(v.string()),

      // Actual amount returned to the member (50% within the 3-day window).
      refundAmountCents: v.optional(v.number()),

      // Teacher pay, stamped at checkout when a teacher is assigned.
      teacherId: v.optional(v.id("users")),
      teacherShareCents: v.optional(v.number()),
      payoutStatus: v.optional(payoutStatus),
    })
      .index("userId", ["userId"])
      .index("programId", ["programId"])
      .index("teacherId", ["teacherId"])
      .index("stripeSessionId", ["stripeSessionId"]),

    // Access granted once an order is paid.
    enrollments: defineTable({
      userId: v.id("users"),
      programId: v.id("programs"),
    })
      .index("userId", ["userId"])
      .index("programId_userId", ["programId", "userId"]),

    // Member-posted study notes.
    notes: defineTable({
      userId: v.id("users"),
      programId: v.id("programs"),
      title: v.string(),
      body: v.string(),
    }).index("programId", ["programId"]),

    // Replies on a study note.
    noteComments: defineTable({
      noteId: v.id("notes"),
      userId: v.id("users"),
      body: v.string(),
    }).index("noteId", ["noteId"]),

    // One-on-one tutor sessions members can book.
    bookings: defineTable({
      userId: v.id("users"),
      tutorName: v.string(),
      topic: v.string(),
      startsAt: v.number(),
      status: bookingStatus,
      meetingUrl: v.optional(v.string()), // video room for the session
    }).index("userId", ["userId"]),

    // Direct member-to-member messages.
    conversations: defineTable({
      participantIds: v.array(v.id("users")),
      sortedParticipantIds: v.array(v.id("users")),
    }).index("byPair", ["sortedParticipantIds"]),

    messages: defineTable({
      conversationId: v.id("conversations"),
      senderId: v.id("users"),
      body: v.string(),
    }).index("conversationId", ["conversationId"]),

    // The library: textbooks, notes, videos, tutorials, and paid courses,
    // organized by discipline.
    materials: defineTable({
      discipline: v.string(),
      kind: materialKind,
      title: v.string(),
      description: v.string(),
      fileUrl: v.optional(v.string()),
      // For paid courses: what it costs and where it lives, e.g.
      // "Included with Coursera Plus" or "$59 one-time purchase".
      pricingNote: v.optional(v.string()),
      contributorId: v.id("users"),
      contributorName: v.string(),
      status: programStatus, // published / draft — same lifecycle as programs
    })
      .index("discipline", ["discipline"])
      .index("contributorId", ["contributorId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
