import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useAction } from "convex/react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";

/**
 * Landing point after Stripe Checkout. Verifies the session against the Stripe
 * API server-side (never trusting the URL alone), then confirms enrollment.
 */
export default function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const canceled = searchParams.get("canceled") === "1";

  const finalize = useAction(api.payments.finalizeCheckoutSession);

  const [state, setState] = useState<"working" | "confirmed" | "issue">(
    sessionId ? "working" : "issue",
  );
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    void (async () => {
      // Small delay: Stripe's session is briefly eventual-consistent right
      // after redirect, and the webhook may race us to settle the order.
      await new Promise((resolve) => setTimeout(resolve, 1500));
      if (cancelled) return;
      try {
        await finalize({ sessionId });
        setState("confirmed");
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "We could not verify the payment.",
        );
        setState("issue");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, finalize, runId]);

  if (canceled && !sessionId) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <p className="display text-2xl font-semibold">Checkout cancelled</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            No payment was made and your place was not reserved. You can return
            to checkout whenever you're ready.
          </p>
          <Button asChild className="mt-6">
            <Link to="/catalog">Back to the catalog</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl px-4 py-24 sm:px-6">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary">
              {state === "working" && (
                <Loader2 className="size-6 animate-spin text-primary" />
              )}
              {state === "confirmed" && (
                <CheckCircle2 className="size-6 text-primary" />
              )}
              {state === "issue" && (
                <AlertTriangle className="size-6 text-destructive" />
              )}
            </div>
            <CardTitle className="display mt-4 text-2xl font-semibold">
              {state === "working" && "Confirming your payment…"}
              {state === "confirmed" && "Your place is confirmed"}
              {state === "issue" && "We couldn't confirm the payment"}
            </CardTitle>
            <CardDescription className="leading-6">
              {state === "working" &&
                "Checking with Stripe. This takes only a moment."}
              {state === "confirmed" &&
                "Welcome to the program. Everything is ready on your dashboard."}
              {state === "issue" &&
                (message ??
                  "Something went sideways while confirming. No double charge is possible — enrollment is only granted once.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap justify-center gap-3">
            {state === "issue" && sessionId && (
              <Button
                onClick={() => {
                  setState("working");
                  setMessage(undefined);
                  setRunId((n) => n + 1);
                }}
              >
                Try again
              </Button>
            )}
            <Button asChild variant={state === "issue" ? "outline" : "default"}>
              <Link to="/dashboard">Go to my studies</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
