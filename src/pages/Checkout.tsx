import { SiteHeader } from "@/components/SiteHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { formatPriceCents } from "@/lib/format";
import { useAction, useMutation, useQuery } from "convex/react";
import { CreditCard, Loader2, Lock, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const programId = searchParams.get("program");
  const navigate = useNavigate();
  const { user } = useAuth();

  const program = useQuery(
    api.programs.getById,
    programId ? { id: programId as never } : "skip",
  );
  const existingEnrollment = useQuery(
    api.store.getEnrollment,
    programId ? { programId: programId as never } : "skip",
  );

  const checkout = useMutation(api.store.checkout);
  const createSession = useAction(api.payments.createCheckoutSession);

  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!program) return;

    setIsProcessing(true);
    try {
      const { url } = await createSession({ programId: program._id, origin: window.location.origin });
      // Hosted Stripe Checkout: the member pays on Stripe's secure page and is
      // returned to /checkout/return, where the enrollment is granted.
      window.location.assign(url);
    } catch (error) {
      // Expected while STRIPE_SECRET_KEY is unset — fall back to the sandbox
      // checkout so enrollment still works end to end.
      if (error instanceof Error && error.message.includes("not configured")) {
        try {
          await checkout({ programId: program._id, cardNumber });
          toast.success("Payment received (sandbox). Your place is confirmed.");
          navigate(`/dashboard?enrolled=${program._id}`);
        } catch (fallbackError) {
          toast.error(
            fallbackError instanceof Error
              ? fallbackError.message
              : "The payment could not be completed.",
          );
          setIsProcessing(false);
        }
      } else {
        toast.error(
          error instanceof Error
            ? error.message
            : "The payment could not be completed.",
        );
        setIsProcessing(false);
      }
    }
  };

  const formatCardNumber = (value: string) =>
    value
      .replace(/\D/g, "")
      .slice(0, 19)
      .replace(/(.{4})/g, "$1 ")
      .trim();

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  if (program === undefined || existingEnrollment === undefined) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!program || program.status !== "published") {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-xl px-4 py-32 text-center">
          <p className="display text-2xl font-semibold">
            That program is not available for enrollment
          </p>
          <Button asChild className="mt-6">
            <Link to="/catalog">Back to the catalog</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (existingEnrollment) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-xl px-4 py-32 text-center">
          <p className="display text-2xl font-semibold">
            You are already enrolled in {program.title}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Your place is confirmed — no further payment is needed.
          </p>
          <Button asChild className="mt-6">
            <Link to="/dashboard">Go to my studies</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        <p className="eyebrow text-primary">Checkout</p>
        <h1 className="display mt-2 text-3xl font-semibold">
          Confirm your enrollment
        </h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          {/* Order summary */}
          <Card className="h-fit">
            <CardHeader>
              <CardDescription>Order summary</CardDescription>
              <CardTitle className="display text-xl leading-snug">
                {program.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tutor</span>
                <span>{program.instructor}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Format</span>
                <span>
                  {program.sessionCount} × {program.durationMinutes}-minute sessions
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Discipline</span>
                <Badge variant="secondary">{program.discipline}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Member</span>
                <span className="max-w-[55%] truncate text-right">
                  {user?.email || user?.name || "—"}
                </span>
              </div>
              <div className="flex items-baseline justify-between border-t border-border pt-4">
                <span className="font-medium">Total due today</span>
                <span className="display text-2xl font-semibold">
                  {formatPriceCents(program.priceCents)}
                </span>
              </div>
            </CardContent>
            <CardFooter className="text-xs leading-5 text-muted-foreground">
              Includes all sessions, marked submissions, and Society access for
              the term. Cancel within the first week for a full refund.
            </CardFooter>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="size-5 text-primary" />
                Payment details
              </CardTitle>
              <CardDescription>
                You'll pay securely on Stripe's hosted checkout page and return
                here to start studying. Test mode: use card 4242 4242 4242 4242.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handlePayment}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="card-name">
                    Name on card
                  </label>
                  <Input
                    id="card-name"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="As printed on the card"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="card-number">
                    Card number
                  </label>
                  <Input
                    id="card-number"
                    inputMode="numeric"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="4242 4242 4242 4242"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium" htmlFor="card-expiry">
                      Expiry
                    </label>
                    <Input
                      id="card-expiry"
                      inputMode="numeric"
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/YY"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium" htmlFor="card-cvc">
                      CVC
                    </label>
                    <Input
                      id="card-cvc"
                      inputMode="numeric"
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="123"
                      required
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-3">
                <Button type="submit" className="w-full" size="lg" disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 size-4" />
                      Pay {formatPriceCents(program.priceCents)}
                    </>
                  )}
                </Button>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="size-3.5" />
                  Refundable within the first week of term.
                </p>
              </CardFooter>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
}
