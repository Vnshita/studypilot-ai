import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { formatPriceCents } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import {
  BadgeCheck,
  BookOpen,
  CircleDollarSign,
  HandCoins,
  Loader2,
  Video,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

const DEFAULT_SHARE_BPS = 7000;

/**
 * Teaching panels shown on the dashboard for members with teacher standing:
 * apply to lead specific programs, and track the pay those programs earn.
 */
export function TeachingPanels() {
  return (
    <div className="mt-10 space-y-6">
      <TeachingApplications />
      <TeacherEarnings />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Apply to teach a specific course
// ---------------------------------------------------------------------------

function TeachingApplications() {
  const openPrograms = useQuery(api.teaching.listOpenPrograms, {});
  const assignments = useQuery(api.teaching.listMyAssignments, {});
  const apply = useMutation(api.teaching.applyToTeach);

  const [target, setTarget] = useState<string | null>(null);
  const [pitch, setPitch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const assignedIds = new Set((assignments ?? []).map((p) => p._id));
  const leading = openPrograms?.filter((p) => assignedIds.has(p._id)) ?? [];
  const open = openPrograms?.filter((p) => !assignedIds.has(p._id)) ?? [];

  const handleApply = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!target) return;
    setIsSubmitting(true);
    try {
      await apply({ programId: target as never, pitch });
      toast.success("Application sent to the registrar.");
      setTarget(null);
      setPitch("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not send the application.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card id="teach-courses" className="scroll-mt-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="size-5 text-primary" />
          Courses you can teach
        </CardTitle>
        <CardDescription>
          Pick the course you want to lead. The registrar confirms the
          assignment and sets your share of each enrollment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {leading.length > 0 && (
          <div>
            <p className="eyebrow text-muted-foreground">You lead</p>
            <ul className="mt-3 space-y-2">
              {leading.map((program) => (
                <li
                  key={program._id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/25 bg-secondary/50 px-4 py-3"
                >
                  <div className="flex items-center gap-2.5">
                    <BadgeCheck className="size-4 text-primary" />
                    <span className="text-sm font-medium">{program.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    You earn{" "}
                    {Math.round((program.teacherShareBps ?? DEFAULT_SHARE_BPS) / 100)}
                    % of each enrollment
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="eyebrow text-muted-foreground">Open for applications</p>
          {openPrograms === undefined ? (
            <Skeleton className="mt-3 h-16 w-full" />
          ) : open.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Every program has a teacher. Check back next term.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {open.map((program) => (
                <li
                  key={program._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/80 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{program.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {program.discipline} · {formatPriceCents(program.priceCents)}{" "}
                      per member · {program.instructor}
                    </p>
                  </div>
                  <Dialog open={target === program._id} onOpenChange={(o) => setTarget(o ? program._id : null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Apply to teach
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="display leading-snug">
                          {program.title}
                        </DialogTitle>
                        <DialogDescription>
                          Tell the registrar why you are the right teacher for
                          this course. If approved, you earn a share of every
                          enrollment.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleApply} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="pitch">Your pitch</Label>
                          <Textarea
                            id="pitch"
                            value={pitch}
                            onChange={(e) => setPitch(e.target.value)}
                            rows={4}
                            placeholder="Your experience with this subject, and how you would run the term…"
                            required
                          />
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && (
                              <Loader2 className="mr-2 size-4 animate-spin" />
                            )}
                            Send application
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Earnings ledger
// ---------------------------------------------------------------------------

function TeacherEarnings() {
  const { user } = useAuth();
  const due = useQuery(api.teaching.listMyEarnings, {});
  const paid = useQuery(api.teaching.listMyPaidOut, {});

  const dueTotal = (due ?? []).reduce((sum, o) => sum + (o.teacherShareCents ?? 0), 0);
  const paidTotal = (paid ?? []).reduce((sum, o) => sum + (o.teacherShareCents ?? 0), 0);

  return (
    <Card id="earnings" className="scroll-mt-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <HandCoins className="size-5 text-primary" />
          Your teaching earnings
        </CardTitle>
        <CardDescription>
          Your share of every enrollment in the courses you lead.{" "}
          {user?.email ? `Payouts are sent to ${user.email}.` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-primary/25 bg-secondary/50 p-4">
            <p className="eyebrow text-muted-foreground">Awaiting payout</p>
            <p className="display mt-1 text-2xl font-semibold">
              {due === undefined ? "—" : formatPriceCents(dueTotal)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {due === undefined
                ? ""
                : `${due.length} ${due.length === 1 ? "enrollment" : "enrollments"}`}
            </p>
          </div>
          <div className="rounded-lg border border-border/80 p-4">
            <p className="eyebrow text-muted-foreground">Paid to date</p>
            <p className="display mt-1 text-2xl font-semibold">
              {paid === undefined ? "—" : formatPriceCents(paidTotal)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {paid === undefined
                ? ""
                : `${paid.length} ${paid.length === 1 ? "payout" : "payouts"}`}
            </p>
          </div>
        </div>

        {due !== undefined && due.length > 0 && (
          <div>
            <p className="eyebrow text-muted-foreground">Ledger</p>
            <ul className="mt-3 divide-y divide-border/70">
              {due.map((order) => (
                <OrderLine key={order._id} orderId={order._id} />
              ))}
            </ul>
          </div>
        )}

        <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
          <CircleDollarSign className="mt-0.5 size-3.5 shrink-0" />
          Payouts run through Stripe when the house connects its account — your
          share is tracked per enrollment until then, and the registrar marks
          each payout as sent.
        </p>
      </CardContent>
    </Card>
  );
}

function OrderLine({ orderId }: { orderId: string }) {
  const order = useQuery(api.store.getOrder, { id: orderId as never });
  const program = useQuery(
    api.programs.getById,
    order ? { id: order.programId as never } : "skip",
  );

  if (!order) return null;

  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {program ? program.title : "Program enrollment"}
        </p>
        <p className="text-xs text-muted-foreground">
          Order · card ending {order.cardLast4}
        </p>
      </div>
      <span className="text-sm font-semibold">
        {formatPriceCents(order.teacherShareCents ?? 0)}
      </span>
    </li>
  );
}

/** "Join session" links shown beside upcoming bookings. */
export function MeetingLink({ url, startsAt }: { url: string; startsAt: number }) {
  if (startsAt - Date.now() > 15 * 60 * 1000) return null;
  return (
    <Button asChild size="sm" variant="outline" className="mt-2 gap-1.5">
      <a href={url} target="_blank" rel="noopener noreferrer">
        <Video className="size-3.5" />
        Join session
      </a>
    </Button>
  );
}
