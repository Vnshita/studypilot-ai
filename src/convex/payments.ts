"use node";

/**
 * Real payments through Stripe.
 *
 * Flow:
 *  1. `createCheckoutSession` opens a Stripe Checkout Session for the program
 *     (house-side charge) and records a `pending` order.
 *  2. The member pays on Stripe's hosted page, then returns to
 *     /checkout/return?session_id=…
 *  3. `finalizeCheckoutSession` verifies the session's payment actually
 *     succeeded via the Stripe API (never trusting the URL alone), upgrades the
 *     order to `paid`, and grants the enrollment.
 *  4. `refundWithStripe` issues a real Stripe refund and revokes access.
 *
 * Money lands in the house's Stripe balance; Stripe pays it out to the house's
 * bank account. Teacher shares continue to be tracked as a ledger
 * (orders.teacherShareCents / payoutStatus) until Connect payouts are enabled.
 *
 * Requires STRIPE_SECRET_KEY in the Convex environment (test mode keys give a
 * fully sandboxed flow — use 4242 4242 4242 4242 to pay).
 *
 * Convex note: actions cannot read the database directly, so every read/write
 * goes through the internal functions in paymentStore.ts; only Stripe API
 * calls and auth identity checks happen inline here.
 */

import Stripe from "stripe";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

let stripeClient: Stripe | null = null;

/** Lazily construct the Stripe client on first real use. */
function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      "Payments are not configured yet. Add STRIPE_SECRET_KEY to the environment.",
    );
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-08-26.dahlia",
    });
  }
  return stripeClient;
}

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

/**
 * Open a Stripe Checkout session for a program. Returns the hosted payment URL
 * to redirect the member to.
 */
export const createCheckoutSession = action({
  args: { programId: v.id("programs"), origin: v.string() },
  handler: async (ctx, args) => {
    const stripe = getStripe();

    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("You must be signed in to check out.");

    const user = await ctx.runQuery(internal.paymentStore.userEmail, {});
    if (!user?.email) {
      throw new Error("A member email is required before paying.");
    }

    const program = await ctx.runQuery(internal.paymentStore.programSnapshot, {
      programId: args.programId,
      userId,
    });
    if (!program) {
      throw new Error("That program is no longer available.");
    }
    if (program.alreadyEnrolled) {
      throw new Error("You are already enrolled in this program.");
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      client_reference_id: args.programId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: program.priceCents,
            product_data: {
              name: program.title,
              description: `${program.discipline} · ${program.level} · ${program.sessionCount} sessions with ${program.instructor}`,
            },
          },
        },
      ],
      success_url: `${args.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${args.origin}/checkout?program=${args.programId}&canceled=1`,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL. Try again.");
    }

    // Record the intent as a pending order so the return page can find it even
    // if the webhook is not configured.
    await ctx.runMutation(internal.paymentStore.insertPendingOrder, {
      userId,
      programId: args.programId,
      amountCents: program.priceCents,
      teacherId: program.teacherId,
      teacherShareCents: program.teacherShareCents,
      stripeSessionId: session.id,
    });

    return { url: session.url };
  },
});

/**
 * Called from /checkout/return. Re-reads the session from Stripe so a member
 * cannot self-enroll by visiting the success URL, then upgrades the pending
 * order and grants access. Safe to retry.
 */
export const finalizeCheckoutSession = action({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const stripe = getStripe();

    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in first.");

    const order = await ctx.runQuery(internal.paymentStore.orderBySession, {
      sessionId: args.sessionId,
    });
    if (!order) throw new Error("No order matches this checkout session.");
    if (order.userId !== userId) {
      throw new Error("This checkout session belongs to another member.");
    }

    // Already settled by a webhook or an earlier pass — settleOrder still
    // guarantees the enrollment exists.
    if (order.status === "paid") {
      await ctx.runMutation(internal.paymentStore.settleOrder, {
        orderId: order._id,
      });
      return;
    }

    const session = await stripe.checkout.sessions.retrieve(args.sessionId);
    const paid =
      session.status === "complete" &&
      session.payment_status === "paid" &&
      typeof session.amount_total === "number" &&
      session.amount_total === order.amountCents;

    if (!paid) {
      throw new Error(
        "The payment has not gone through yet. If you just paid, wait a moment and try again.",
      );
    }

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent?.id ?? undefined);

    await ctx.runMutation(internal.paymentStore.settleOrder, {
      orderId: order._id,
      paymentIntentId,
    });
  },
});

/** Ops helper (admin): re-check a session and settle it if Stripe says paid. */
export const checkSessionStatus = action({
  args: { sessionId: v.string() },
  handler: async (ctx, args): Promise<"paid" | "pending" | "refunded"> => {
    const stripe = getStripe();

    const isAdmin = await ctx.runQuery(internal.paymentStore.callerIsAdmin, {});
    if (!isAdmin) {
      throw new Error("This action is only available to administrators.");
    }

    const order = await ctx.runQuery(internal.paymentStore.orderBySession, {
      sessionId: args.sessionId,
    });
    if (!order) throw new Error("No order matches that session.");

    if (order.status === "pending") {
      const session = await stripe.checkout.sessions.retrieve(args.sessionId);
      if (session.status === "complete" && session.payment_status === "paid") {
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? undefined);
        await ctx.runMutation(internal.paymentStore.settleOrder, {
          orderId: order._id,
          paymentIntentId,
        });
        return "paid" as const;
      }
    }
    return order.status;
  },
});

// ---------------------------------------------------------------------------
// Refunds
// ---------------------------------------------------------------------------

/** Admin: refund via Stripe when possible, fall back to ledger-only refunds. */
export const refundWithStripe = action({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const isAdmin = await ctx.runQuery(internal.paymentStore.callerIsAdmin, {});
    if (!isAdmin) {
      throw new Error("This action is only available to administrators.");
    }

    const order = await ctx.runQuery(internal.paymentStore.orderById, {
      orderId: args.orderId,
    });
    if (!order) throw new Error("That order no longer exists.");
    if (order.status !== "paid") {
      throw new Error("Only paid orders can be refunded.");
    }

    let stripeRefunded = false;
    if (order.stripePaymentIntentId && process.env.STRIPE_SECRET_KEY) {
      try {
        await getStripe().refunds.create({
          payment_intent: order.stripePaymentIntentId,
        });
        stripeRefunded = true;
      } catch {
        // Intent not refundable (test-mode cleanup, already refunded, …).
        // Fall through and refund in the ledger so access is still revoked.
      }
    }

    await ctx.runMutation(internal.paymentStore.completeRefund, {
      orderId: args.orderId,
      stripeRefunded,
    });
    return { stripeRefunded };
  },
});
