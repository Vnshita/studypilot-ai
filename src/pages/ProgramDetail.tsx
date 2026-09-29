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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { formatPriceCents } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";import {
  CalendarClock,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Layers,
  ListChecks,
  Loader2,
  Lock,
  NotebookPen,
  Trash2,
  Users,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

const CURRICULUM_TEMPLATE = [
  "Foundations: diagnostic reading and a personal study plan",
  "Core sessions: weekly seminars with set problems",
  "Marked submissions: written work returned with tutor commentary",
  "Integration: a capstone review with your tutor, one on one",
];

/** Library picks for this program's discipline, shown in the sidebar. */
function LibraryShelf({ discipline }: { discipline: string }) {
  const materials = useQuery(api.library.listByDiscipline, { discipline });

  if (materials === undefined) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <p className="text-sm leading-6 text-muted-foreground">
        The {discipline} shelf is being stocked. Browse the{" "}
        <Link
          to="/library"
          className="text-primary underline-offset-4 hover:underline"
        >
          full Library
        </Link>
        .
      </p>
    );
  }

  return (
    <div>
      <ul className="space-y-3">
        {materials.slice(0, 3).map((material) => (
          <li key={material._id} className="flex items-start gap-2.5">
            {material.kind === "textbook" ? (
              <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" />
            ) : (
              <NotebookPen className="mt-0.5 size-4 shrink-0 text-primary" />
            )}
            {material.kind === "textbook" && material.fileUrl ? (
              <a
                href={material.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium leading-6 text-foreground underline-offset-4 hover:underline"
              >
                {material.title}
              </a>
            ) : (
              <Link
                to="/library"
                className="text-sm font-medium leading-6 text-foreground underline-offset-4 hover:underline"
              >
                {material.title}
              </Link>
            )}
          </li>
        ))}
      </ul>
      <Button asChild variant="outline" className="mt-4 w-full">
        <Link to="/library">Visit the Library</Link>
      </Button>
    </div>
  );
}

export default function ProgramDetail() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const program = useQuery(
    api.programs.getById,
    programId ? { id: programId as never } : "skip",
  );
  const enrollment = useQuery(
    api.store.getEnrollment,
    programId ? { programId: programId as never } : "skip",
  );

  if (program === undefined) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (program === null) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-32 text-center">
          <p className="display text-3xl font-semibold">
            This program is not in session
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            It may have concluded or been withdrawn. The registrar keeps a full
            list of what is currently offered.
          </p>
          <Button asChild className="mt-6">
            <Link to="/catalog">Back to the catalog</Link>
          </Button>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="paper-texture border-b border-border/80">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{program.discipline}</Badge>
              <Badge variant="outline">{program.level}</Badge>
            </div>
            <h1 className="display mt-5 text-4xl font-semibold leading-tight">
              {program.title}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
              {program.summary}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Users className="size-4 text-primary" />
                Led by {program.instructor}
              </span>
              <span className="inline-flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                {program.sessionCount} sessions
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                {program.durationMinutes} minutes each
              </span>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              {program.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <aside className="lg:pl-4">
            <Card className="shadow-[0_24px_48px_-28px_oklch(0.29_0.059_38/0.35)]">
              <CardHeader>
                <CardDescription>Enrollment</CardDescription>
                <p className="display text-4xl font-semibold">
                  {formatPriceCents(program.priceCents)}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    per term
                  </span>
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  <li className="flex gap-2.5">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    {program.sessionCount} sessions with {program.instructor}
                  </li>
                  <li className="flex gap-2.5">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    Marked written submissions each week
                  </li>
                  <li className="flex gap-2.5">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    Full access to the Society
                  </li>
                </ul>

                {enrollment ? (
                  <>
                    <div className="rounded-md bg-secondary/70 px-4 py-3 text-sm text-secondary-foreground">
                      <CheckCircle2 className="mr-2 inline size-4 text-primary" />
                      You are enrolled this term.
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => navigate(`/dashboard#program-${program._id}`)}
                    >
                      <GraduationCap className="mr-2 size-4" />
                      Go to my studies
                    </Button>
                  </>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() =>
                      isAuthenticated
                        ? navigate(`/checkout?program=${program._id}`)
                        : navigate(
                            `/auth?returnTo=${encodeURIComponent(
                              `/checkout?program=${program._id}`,
                            )}`,
                          )
                    }
                  >
                    Enroll in this program
                  </Button>
                )}
                <p className="text-center text-xs text-muted-foreground">
                  One payment per term. 50% refund if you cancel within 3 days.
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>

      <main className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-10">
          <section>
            <h2 className="display text-2xl font-semibold">About this program</h2>
            <p className="mt-4 whitespace-pre-line text-base leading-8 text-muted-foreground">
              {program.description}
            </p>
          </section>

          <section>
            <h2 className="display text-2xl font-semibold">How the term runs</h2>
            <ol className="mt-5 space-y-4">
              {CURRICULUM_TEMPLATE.map((item, index) => (
                <li
                  key={item}
                  className="flex gap-4 rounded-lg border border-border/80 bg-card p-5"
                >
                  <span className="display flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-sm font-semibold text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="text-sm leading-7 text-muted-foreground">{item}</p>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              A detailed syllabus is shared with enrolled members before the
              first session.
            </p>
          </section>

          <section id="notes">
            <div className="flex items-center gap-2">
              <h2 className="display text-2xl font-semibold">Study notes</h2>
              <NotebookPen className="size-4 text-muted-foreground" />
            </div>
            {enrollment ? (
              <NotesSection
                programId={program._id}
                programTitle={program.title}
              />
            ) : (
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-dashed border-border bg-secondary/40 p-6">
                <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="text-sm leading-6 text-muted-foreground">
                  Members of this program share annotated notes here — the
                  difficult steps, the elegant ones, and what the tutor
                  emphasised. Enroll to read and contribute.
                </p>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Session rhythm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <CalendarClock className="size-4 text-primary" />
                Weekly at a fixed hour, agreed with your cohort
              </p>
              <p className="flex items-center gap-2">
                <ListChecks className="size-4 text-primary" />
                Submissions due the evening before each session
              </p>
              <p className="flex items-center gap-2">
                <GraduationCap className="size-4 text-primary" />
                Private tutor review included at term's end
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">From the Library</CardTitle>
            </CardHeader>
            <CardContent>
              <LibraryShelf discipline={program.discipline} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bring a question</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                Every program admits questions before you pay. Book a short
                conversation with the tutor and ask whether it is the right term
                for you.
              </p>
              <Button asChild variant="outline" className="mt-4 w-full">
                <Link to="/book">Book a conversation</Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </main>

      <SiteFooter />
    </div>
  );
}

function NotesSection({
  programId,
  programTitle,
}: {
  programId: string;
  programTitle: string;
}) {
  const notes = useQuery(api.community.listForProgram, { programId: programId as never });
  const createNote = useMutation(api.community.create);
  const removeNote = useMutation(api.community.remove);
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePublish = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await createNote({ programId: programId as never, title, body });
      setTitle("");
      setBody("");
      toast.success("Note published to the Society.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not publish the note.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (noteId: string) => {
    try {
      await removeNote({ id: noteId as never });
      toast.success("Note removed.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not remove the note.",
      );
    }
  };

  return (
    <div className="mt-4 space-y-5">
      <form
        onSubmit={handlePublish}
        className="space-y-3 rounded-lg border border-border/80 bg-card p-5"
      >
        <p className="text-sm font-medium">
          Share a note from {programTitle}
        </p>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="A title for your note"
          required
        />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What did you work through, and what would you tell last week's you?"
          rows={4}
          required
        />
        <Button type="submit" size="sm" disabled={isSubmitting} className="gap-2">
          {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
          Publish note
        </Button>
      </form>

      {notes === undefined ? (
        <div className="flex justify-center py-6">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No notes yet this term. Yours can be the first.
        </p>
      ) : (
        <ul className="space-y-4">
          {notes.map((note) => (
            <li
              key={note._id}
              className="rounded-lg border border-border/80 bg-card p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="display font-semibold">{note.title}</p>
                {note.userId === user?._id && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove note"
                    onClick={() => handleRemove(note._id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                {note.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
