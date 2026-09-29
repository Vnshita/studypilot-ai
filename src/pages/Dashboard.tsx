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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { formatPriceCents, formatSessionTime } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowUpRight,
  BookOpen,
  CalendarClock,
  CircleDollarSign,
  CreditCard,
  GraduationCap,
  Layers,
  Loader2,
  Plus,
  Presentation,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

export default function Dashboard() {
  const { user } = useAuth();
  const enrollments = useQuery(api.store.listForUser, {});
  const orders = useQuery(api.store.listOrdersForUser, {});
  const bookings = useQuery(api.booking.listForUser, {});
  const myMaterials = useQuery(api.library.listMine, {});

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
          <div className="flex flex-wrap gap-2">
            {user?.standing === "teacher" && (
              <Button asChild variant="outline" className="gap-2">
                <Link to="/library">
                  <BookOpen className="size-4" />
                  The Library
                </Link>
              </Button>
            )}
            <Button asChild className="gap-2">
              <Link to="/catalog">
                <Sparkles className="size-4" />
                Add another program
              </Link>
            </Button>
          </div>
        </div>

        <StandingCard standing={user?.standing ?? null} name={user?.name ?? null} />


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

        {user?.standing === "teacher" && (
          <TeachingStudio materials={myMaterials ?? []} name={user.name ?? null} />
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

// ---------------------------------------------------------------------------
// Standing — learn, teach, or carry both ledgers
// ---------------------------------------------------------------------------

function StandingCard({
  standing,
  name,
}: {
  standing: "student" | "teacher" | null;
  name: string | null;
}) {
  const setStanding = useMutation(api.membership.setStanding);
  const [isSaving, setIsSaving] = useState<"student" | "teacher" | null>(null);

  const choose = async (value: "student" | "teacher") => {
    setIsSaving(value);
    try {
      await setStanding({ standing: value });
      toast.success(
        value === "teacher"
          ? "Welcome to the common room — the teaching studio is open below."
          : "You are enrolled as a student. Choose a program to begin.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save your choice.",
      );
    } finally {
      setIsSaving(null);
    }
  };

  return (
    <div id="standing" className="mt-8 scroll-mt-24">
      {standing === null ? (
        <Card className="border-primary/25 bg-secondary/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="size-4 text-primary" />
              How will you take part in the house?
            </CardTitle>
            <CardDescription>
              You can change this at any time — many members do both.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col rounded-lg border border-border/80 bg-card p-5">
              <p className="display text-lg font-semibold">Learn as a student</p>
              <p className="mt-1.5 flex-1 text-sm leading-6 text-muted-foreground">
                Enroll in programs, book one-on-one sessions, and take your
                place in the Society.
              </p>
              <Button
                className="mt-4"
                disabled={isSaving !== null}
                onClick={() => choose("student")}
              >
                {isSaving === "student" && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                I'm here to learn
              </Button>
            </div>
            <div className="flex flex-col rounded-lg border border-border/80 bg-card p-5">
              <p className="display text-lg font-semibold">Teach at the house</p>
              <p className="mt-1.5 flex-1 text-sm leading-6 text-muted-foreground">
                Contribute textbooks and study notes to the Library and share
                your discipline with other members.
              </p>
              <Button
                className="mt-4"
                disabled={isSaving !== null}
                onClick={() => choose("teacher")}
              >
                {isSaving === "teacher" && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                I'm here to teach
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-card px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-secondary text-primary">
              {standing === "teacher" ? (
                <Presentation className="size-4" />
              ) : (
                <GraduationCap className="size-4" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">
                {standing === "teacher"
                  ? `Teaching at the house${name ? `, ${name}` : ""}`
                  : `Studying at the house${name ? `, ${name}` : ""}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {standing === "teacher"
                  ? "Your studio for the Library is below."
                  : "Enroll in a program or book a session to begin."}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={isSaving !== null}
            onClick={() => choose(standing === "teacher" ? "student" : "teacher")}
          >
            Switch to {standing === "teacher" ? "student" : "teacher"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Teaching studio — contribute to the Library
// ---------------------------------------------------------------------------

interface StudioMaterial {
  _id: string;
  discipline: string;
  kind: "textbook" | "notes" | "video" | "tutorial" | "course";
  title: string;
}

function TeachingStudio({
  materials,
  name,
}: {
  materials: StudioMaterial[];
  name: string | null;
}) {
  const disciplines = useQuery(api.programs.listDisciplines, {});
  const createMaterial = useMutation(api.library.create);
  const removeMaterial = useMutation(api.library.remove);

  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    discipline: "",
    kind: "textbook" as "textbook" | "notes" | "video" | "tutorial" | "course",
    title: "",
    description: "",
    fileUrl: "",
    pricingNote: "",
  });

  const shelfOptions = disciplines ?? [];

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await createMaterial({
        discipline: form.discipline,
        kind: form.kind,
        title: form.title,
        description: form.description,
        fileUrl: form.fileUrl.trim() || undefined,
        pricingNote: form.pricingNote.trim() || undefined,
      });
      toast.success("Filed to the Library shelf.");
      setForm({
        discipline: "",
        kind: "textbook",
        title: "",
        description: "",
        fileUrl: "",
        pricingNote: "",
      });
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not add the material.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeMaterial({ id: id as never });
      toast.success("Withdrawn from the shelf.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not withdraw the item.",
      );
    }
  };

  return (
    <section id="studio" className="mt-10 scroll-mt-24">
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Presentation className="size-5 text-primary" />
              Teaching studio
            </CardTitle>
            <CardDescription>
              {name
                ? `${name}, the Library is yours to stock. Textbooks link out to PDFs; notes are read in place.`
                : "Stock the Library with textbooks and notes."}
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="size-3.5" />
                Add material
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add to the Library</DialogTitle>
                <DialogDescription>
                  Textbooks open as PDFs in a new window; study notes are read
                  in place.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="m-kind">Type</Label>
                    <Select
                      value={form.kind}
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          kind: v as typeof form.kind,
                        }))
                      }
                    >
                      <SelectTrigger id="m-kind" className="w-full">
                        <SelectValue placeholder="Choose a type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="textbook">Textbook (free PDF)</SelectItem>
                        <SelectItem value="notes">Study notes</SelectItem>
                        <SelectItem value="video">Video course (free)</SelectItem>
                        <SelectItem value="tutorial">Tutorial (free)</SelectItem>
                        <SelectItem value="course">Paid course (external)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="m-discipline">Discipline</Label>
                    <Input
                      id="m-discipline"
                      value={form.discipline}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, discipline: e.target.value }))
                      }
                      placeholder="Mathematics"
                      list="studio-disciplines"
                      required
                    />
                    <datalist id="studio-disciplines">
                      {shelfOptions.map((d) => (
                        <option key={d} value={d} />
                      ))}
                    </datalist>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-title">Title</Label>
                  <Input
                    id="m-title"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. House Notes: Reading a Proof Twice"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-description">
                    {form.kind === "textbook"
                      ? "Description"
                      : "The notes themselves"}
                  </Label>
                  <Textarea
                    id="m-description"
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    rows={5}
                    required
                  />
                </div>
                {(form.kind === "textbook" ||
                  form.kind === "video" ||
                  form.kind === "tutorial" ||
                  form.kind === "course") && (
                  <div className="space-y-1.5">
                    <Label htmlFor="m-url">Link (https://…)</Label>
                    <Input
                      id="m-url"
                      type="url"
                      value={form.fileUrl}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, fileUrl: e.target.value }))
                      }
                      placeholder={
                        form.kind === "course"
                          ? "https://www.coursera.org/learn/…"
                          : "https://example.com/resource"
                      }
                    />
                  </div>
                )}
                {form.kind === "course" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="m-pricing">Pricing note (shown on the card)</Label>
                    <Input
                      id="m-pricing"
                      value={form.pricingNote}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, pricingNote: e.target.value }))
                      }
                      placeholder="e.g. Subscription · free tier available"
                      required
                    />
                  </div>
                )}
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                    File to the shelf
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {materials.length === 0 ? (
            <p className="py-4 text-sm leading-6 text-muted-foreground">
              Nothing on the shelves under your name yet. A single well-made
              sheet of notes outlives most lectures.
            </p>
          ) : (
            <ul className="divide-y divide-border/70">
              {materials.map((material) => (
                <li
                  key={material._id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {material.kind === "textbook" ? (
                      <BookOpen className="size-4 shrink-0 text-primary" />
                    ) : material.kind === "course" ? (
                      <CircleDollarSign className="size-4 shrink-0 text-primary" />
                    ) : (
                      <Presentation className="size-4 shrink-0 text-primary" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{material.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {material.discipline} ·{" "}
                        {material.kind === "textbook"
                          ? "Textbook"
                          : material.kind === "video"
                            ? "Video"
                            : material.kind === "tutorial"
                              ? "Tutorial"
                              : material.kind === "course"
                                ? "Paid course"
                                : "Notes"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(material._id)}
                  >
                    <Trash2 className="mr-1.5 size-3.5" />
                    Withdraw
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
