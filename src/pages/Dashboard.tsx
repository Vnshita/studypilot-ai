import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { formatPriceCents, formatSessionTime } from "@/lib/format";
import { useQuery } from "convex/react";
import {
  ArrowUpRight,
  CalendarClock,
  CreditCard,
  GraduationCap,
  Layers,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router";

export default function Dashboard() {
  const { user } = useAuth();
  const enrollments = useQuery(api.store.listForUser, {});
  const orders = useQuery(api.store.listOrdersForUser, {});
  const bookings = useQuery(api.booking.listForUser, {});

  const isLoading =
    enrollments === undefined || orders === undefined || bookings === undefined;

  const upcoming = (bookings ?? [])
    .filter((b) => b.status === "upcoming" && b.startsAt > Date.now())
    .sort((a, b) => a.startsAt - b.startsAt);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-primary">My studies</p>
            <h1 className="display mt-2 text-3xl font-semibold">
              Welcome{user?.name ? `, ${user.name}` : " back"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your programs, sessions, and receipts — all in the one place.
            </p>
          </div>
          <Button asChild className="gap-2">
            <Link to="/catalog">
              <Sparkles className="size-4" />
              Add another program
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            Loading your term…
          </div>
        ) : (
          <div className="mt-10 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            {/* Enrollments */}
            <section>
              <h2 className="display flex items-center gap-2 text-xl font-semibold">
                <GraduationCap className="size-5 text-primary" />
                Enrolled programs
              </h2>
              {enrollments.length === 0 ? (
                <Empty className="mt-4 rounded-lg border border-dashed">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <GraduationCap />
                    </EmptyMedia>
                    <EmptyTitle>No programs yet</EmptyTitle>
                    <EmptyDescription>
                      Choose a program from the catalog and your term will begin
                      the moment enrollment is confirmed.
                    </EmptyDescription>
                  </EmptyHeader>
                  <Button asChild>
                    <Link to="/catalog">Browse the catalog</Link>
                  </Button>
                </Empty>
              ) : (
                <ul className="mt-4 space-y-4">
                  {enrollments.map((enrollment) => (
                    <EnrolledProgram
                      key={enrollment._id}
                      enrollmentId={enrollment._id}
                      programId={enrollment.programId}
                    />
                  ))}
                </ul>
              )}
            </section>

            <aside className="space-y-6">
              {/* Upcoming sessions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarClock className="size-4 text-primary" />
                    Upcoming sessions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {upcoming.length === 0 ? (
                    <p className="text-sm leading-6 text-muted-foreground">
                      Nothing scheduled.{" "}
                      <Link to="/book" className="text-primary underline-offset-4 hover:underline">
                        Book a tutor session
                      </Link>{" "}
                      when you are ready.
                    </p>
                  ) : (
                    <ul className="space-y-3.5">
                      {upcoming.slice(0, 4).map((booking) => (
                        <li
                          key={booking._id}
                          className="border-b border-border/60 pb-3.5 last:border-0 last:pb-0"
                        >
                          <p className="text-sm font-medium">{booking.topic}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {booking.tutorName} · {formatSessionTime(booking.startsAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Payment history */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CreditCard className="size-4 text-primary" />
                    Payment history
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {orders.length === 0 ? (
                    <p className="text-sm leading-6 text-muted-foreground">
                      No payments on record yet.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {orders.map((order) => (
                        <li
                          key={order._id}
                          className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                        >
                          <div>
                            <OrderProgramName programId={order.programId} />
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Card ending {order.cardLast4}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {formatPriceCents(order.amountCents)}
                            </p>
                            <Badge
                              variant={order.status === "paid" ? "secondary" : "outline"}
                              className="mt-0.5"
                            >
                              {order.status === "paid" ? "Paid" : "Refunded"}
                            </Badge>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </aside>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function EnrolledProgram({
  programId,
}: {
  programId: string;
  enrollmentId: string;
}) {
  const program = useQuery(api.programs.getById, { id: programId as never });

  if (!program) return null;

  return (
    <li
      id={`program-${program._id}`}
      className="rounded-lg border border-border/80 bg-card p-6 transition-colors hover:border-primary/30"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Badge variant="secondary" className="mb-2.5">
            {program.discipline}
          </Badge>
          <h3 className="display text-lg font-semibold leading-snug">
            {program.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            With {program.instructor}
          </p>
        </div>
        <span className="display text-lg font-semibold">
          {formatPriceCents(program.priceCents)}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Layers className="size-3.5" />
          {program.sessionCount} sessions · {program.durationMinutes} minutes
        </span>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link to={`/programs/${program._id}`}>
              Program page
              <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to={`/programs/${program._id}#notes`}>Study notes</Link>
          </Button>
        </div>
      </div>
    </li>
  );
}

function OrderProgramName({ programId }: { programId: string }) {
  const program = useQuery(api.programs.getById, { id: programId as never });
  return (
    <p className="text-sm font-medium">
      {program ? program.title : "Program enrollment"}
    </p>
  );
}
