import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { formatSessionTime } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { CalendarClock, CheckCircle2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

// Hourly slots the house keeps free for one-on-one sessions.
const SLOT_HOURS = [9, 10, 11, 13, 14, 15, 16, 17, 18, 19] as const;

const SESSION_FEE_CENTS = 4500;

export default function BookSession() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const bookings = useQuery(api.booking.listForUser, {});
  const book = useMutation(api.booking.book);
  const cancel = useMutation(api.booking.cancel);

  const [tutor, setTutor] = useState<string>("Dr. Margot Ellery");
  const [topic, setTopic] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [slot, setSlot] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSlotTaken = (hour: number) => {
    if (!date) return false;
    const startsAt = new Date(date);
    startsAt.setHours(hour, 0, 0, 0);
    return (bookings ?? []).some(
      (b) =>
        b.status === "upcoming" &&
        b.tutorName === tutor &&
        b.startsAt === startsAt.getTime(),
    );
  };

  const handleBook = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!date || slot === null) {
      toast.error("Choose a date and a time for the session.");
      return;
    }
    const startsAt = new Date(date);
    startsAt.setHours(slot, 0, 0, 0);

    setIsSubmitting(true);
    try {
      await book({ tutorName: tutor, topic, startsAt: startsAt.getTime() });
      toast.success(
        `Session reserved with ${tutor}. A confirmation is on its way to your inbox.`,
      );
      setTopic("");
      setSlot(null);
      navigate("/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The session could not be reserved.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (bookingId: string) => {
    try {
      await cancel({ id: bookingId as never });
      toast.success("Session cancelled. The hour is free again.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not cancel the session.",
      );
    }
  };

  const upcoming = (bookings ?? [])
    .filter((b) => b.status === "upcoming" && b.startsAt > Date.now())
    .sort((a, b) => a.startsAt - b.startsAt);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <div className="max-w-2xl">
          <p className="eyebrow text-primary">Private tutoring</p>
          <h1 className="display mt-2 text-3xl font-semibold">
            Book a one-on-one session
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Fifty minutes with the tutor of your choice, on any question worth an
            hour. Sessions are ${SESSION_FEE_CENTS / 100} each and are invoiced
            with your next program enrollment.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <form onSubmit={handleBook}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Reserve a time</CardTitle>
                <CardDescription>
                  Pick a tutor, choose an hour, and say what you would like to
                  cover. The calendar below shows this term's availability.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Tutor</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {TUTORS_LIST.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTutor(t)}
                        className={`rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                          tutor === t
                            ? "border-primary bg-secondary/70 font-medium text-foreground"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="topic">
                    What should the session cover?
                  </label>
                  <Input
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Eigenvalue intuition before Thursday's paper"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Date</p>
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      setDate(d);
                      setSlot(null);
                    }}
                    disabled={{ before: new Date() }}
                    className="rounded-md border bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Time</p>
                  {date ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {SLOT_HOURS.map((hour) => {
                        const taken = isSlotTaken(hour);
                        return (
                          <button
                            key={hour}
                            type="button"
                            disabled={taken}
                            onClick={() => setSlot(hour)}
                            className={`rounded-md border px-2 py-2 text-sm transition-colors ${
                              slot === hour
                                ? "border-primary bg-primary text-primary-foreground"
                                : taken
                                  ? "cursor-not-allowed border-border bg-muted text-muted-foreground line-through opacity-60"
                                  : "border-border bg-card text-foreground hover:border-primary/40"
                            }`}
                          >
                            {hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Choose a date to see the open hours.
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isSubmitting || !date || slot === null}
                >
                  <CalendarClock className="mr-2 size-4" />
                  Reserve the session
                </Button>
              </CardContent>
            </Card>
          </form>

          <aside className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Your upcoming sessions</CardTitle>
              </CardHeader>
              <CardContent>
                {bookings === undefined ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : upcoming.length === 0 ? (
                  <p className="text-sm leading-6 text-muted-foreground">
                    Nothing reserved yet. Members usually book before an
                    examination week.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {upcoming.map((booking) => (
                      <li
                        key={booking._id}
                        className="flex items-start justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                      >
                        <div>
                          <p className="text-sm font-medium">{booking.topic}</p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CheckCircle2 className="size-3.5 text-primary" />
                            {booking.tutorName} · {formatSessionTime(booking.startsAt)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Cancel session"
                          onClick={() => handleCancel(booking._id)}
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Good to know</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm leading-6 text-muted-foreground">
                <p>
                  Sessions run fifty minutes, on the hour, and are held quietly —
                  camera on, notes ready.
                </p>
                <p>
                  Cancel any time up to the evening before and the hour returns
                  to the calendar.
                </p>
                {!user && (
                  <p>
                    <Link
                      to="/auth?returnTo=%2Fbook"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Sign in
                    </Link>{" "}
                    to reserve your first session.
                  </p>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

// Keep the tutor roster next to the page that renders it.
const TUTORS_LIST = [
  "Dr. Margot Ellery",
  "Prof. Adrian Kwei",
  "Hazel Marchetti",
  "Dr. Priya Raghavan",
  "Ines Duarte",
] as const;
