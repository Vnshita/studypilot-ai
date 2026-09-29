import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  openStaxReaderUrl,
  openStaxPdfPageUrl,
} from "@/lib/openstax";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  BookMarked,
  BookOpen,
  CircleDollarSign,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  NotebookPen,
  Play,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

export default function Library() {
  const { user } = useAuth();
  const disciplines = useQuery(api.library.listDisciplines, {});
  const programDisciplines = useQuery(api.programs.listDisciplines, {});

  // Default to the first shelf once both sources load; keep the user's choice.
  const [active, setActive] = useState<string | null>(null);

  const shelves = disciplines ?? [];
  const emptyShelves = (programDisciplines ?? []).filter(
    (d) => !shelves.includes(d),
  );

  const shelf = active ?? shelves[0] ?? null;
  const materials = useQuery(
    api.library.listByDiscipline,
    shelf ? { discipline: shelf } : "skip",
  );

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="paper-texture border-b border-border/80">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <p className="eyebrow text-primary">The Library</p>
          <h1 className="display mt-2 text-3xl font-semibold">
            Textbooks &amp; study material
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Openly licensed textbooks and notes written at the house, arranged
            by discipline. Teachers at the Society contribute to the shelves;
            everything here is free to members.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {shelves === undefined ? (
              <Skeleton className="h-9 w-40" />
            ) : (
              shelves.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setActive(d)}
                  className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                    shelf === d
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {d}
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        {materials === undefined ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : materials.length === 0 ? (
          <Empty className="rounded-lg border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BookMarked />
              </EmptyMedia>
              <EmptyTitle>This shelf is waiting for its first book</EmptyTitle>
              <EmptyDescription>
                {shelf
                  ? `Nothing has been filed under ${shelf} yet.`
                  : "Choose a discipline above."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="display text-xl font-semibold">{shelf}</h2>
              <p className="text-sm text-muted-foreground">
                {materials.length}{" "}
                {materials.length === 1 ? "item" : "items"} on the shelf
              </p>
            </div>
            <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {materials.map((material) => (
                <MaterialCard
                  key={material._id}
                  material={{
                    _id: material._id,
                    kind: material.kind,
                    title: material.title,
                    description: material.description,
                    fileUrl: material.fileUrl ?? null,
                    pricingNote: material.pricingNote ?? null,
                    contributorName: material.contributorName,
                  }}
                  canManage={user?._id === material.contributorId}
                />
              ))}
            </div>
          </>
        )}

        {/* Teachers' studio entry */}
        {user?.standing === "teacher" ? (
          <div className="mt-12 rounded-lg border border-border/80 bg-secondary/50 p-6 text-center">
            <p className="display text-lg font-semibold">Teaching at the house?</p>
            <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-muted-foreground">
              You can add textbooks and notes to any shelf from your dashboard.
            </p>
            <Button asChild className="mt-4">
              <Link to="/dashboard#studio">Open the teaching studio</Link>
            </Button>
          </div>
        ) : user ? (
          <div className="mt-12 rounded-lg border border-border/80 bg-secondary/50 p-6 text-center">
            <p className="display text-lg font-semibold">
              Contribute to the shelves
            </p>
            <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-muted-foreground">
              Members who enroll as teachers can add textbooks and study notes
              to any discipline.
            </p>
            <Button asChild className="mt-4">
              <Link to="/dashboard#standing">Enroll as a teacher</Link>
            </Button>
          </div>
        ) : null}

        {/* Disciplines with programs but no material yet */}
        {emptyShelves.length > 0 && (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Programs also run in{" "}
            {emptyShelves.map((d, i) => (
              <span key={d}>
                {i > 0 && (i === emptyShelves.length - 1 ? " and " : ", ")}
                <strong className="font-medium text-foreground">{d}</strong>
              </span>
            ))}
            {emptyShelves.length === 1 ? " — its shelf" : " — their shelves"} are
            still being stocked.
          </p>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Material card + notes reader
// ---------------------------------------------------------------------------

interface MaterialCardData {
  _id: string;
  kind: "textbook" | "notes" | "video" | "tutorial" | "course";
  title: string;
  description: string;
  fileUrl: string | null;
  pricingNote?: string | null;
  contributorName: string;
}

/** Extract a YouTube playlist ID from a URL, if the link is one. */
function youTubePlaylistId(url: string): string | null {
  const match = url.match(/[?&]list=([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

const KIND_LABEL: Record<MaterialCardData["kind"], string> = {
  textbook: "Textbook",
  notes: "Notes",
  video: "Video",
  tutorial: "Tutorial",
  course: "Paid course",
};

function MaterialCard({
  material,
  canManage,
}: {
  material: MaterialCardData;
  canManage: boolean;
}) {
  const remove = useMutation(api.library.remove);
  const [open, setOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const isNotes = material.kind === "notes";
  const isPaid = material.kind === "course";
  const Icon =
    material.kind === "textbook"
      ? BookOpen
      : material.kind === "video"
        ? Play
        : material.kind === "tutorial"
          ? ExternalLink
          : isPaid
            ? CircleDollarSign
            : NotebookPen;

  const action = (() => {
    if (isNotes) {
      return (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={() => setOpen(true)}
        >
          <FileText className="size-3.5" />
          Read the notes
        </Button>
      );
    }
    if (!material.fileUrl) {
      return (
        <p className="text-xs text-muted-foreground">
          The link to this item is being restored.
        </p>
      );
    }
    if (material.kind === "textbook" && openStaxReaderUrl(material.fileUrl)) {
      // OpenStax books open instantly in the in-app web reader; the 50–110 MB
      // PDF is offered as a secondary download from the book's details page.
      const pdfPage = openStaxPdfPageUrl(material.fileUrl);
      return (
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => setOpen(true)}
          >
            <BookOpen className="size-3.5" />
            Read the book
          </Button>
          <Button asChild variant="ghost" size="sm" className="w-full gap-2">
            <a href={pdfPage ?? "https://openstax.org/subjects"} target="_blank" rel="noopener noreferrer">
              <Download className="size-3.5" />
              PDF download
            </a>
          </Button>
        </div>
      );
    }
    if (material.kind === "textbook") {
      return (
        <Button asChild variant="outline" size="sm" className="w-full gap-2">
          <a href={material.fileUrl} target="_blank" rel="noopener noreferrer">
            <Download className="size-3.5" />
            Open the PDF
          </a>
        </Button>
      );
    }
    const cta =
      material.kind === "video"
        ? "Watch the series"
        : material.kind === "tutorial"
          ? "Open the tutorial"
          : "View the course";
    return (
      <Button asChild variant="outline" size="sm" className="w-full gap-2">
        <a href={material.fileUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="size-3.5" />
          {cta}
        </a>
      </Button>
    );
  })();

  const playlistId =
    material.kind === "video" && material.fileUrl
      ? youTubePlaylistId(material.fileUrl)
      : null;

  // OpenStax textbooks read inside the app via their web reader.
  const readerUrl =
    material.kind === "textbook" && material.fileUrl
      ? openStaxReaderUrl(material.fileUrl)
      : null;

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await remove({ id: material._id as never });
      toast.success("Removed from the shelf.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not remove the item.",
      );
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <>
      <div className="group flex h-full flex-col rounded-lg border border-border/80 bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_12px_32px_-16px_oklch(0.29_0.059_38/0.25)]">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="gap-1.5 font-medium">
            <Icon className="size-3" />
            {KIND_LABEL[material.kind]}
          </Badge>
          {canManage && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Remove from shelf"
              onClick={handleRemove}
              disabled={isRemoving}
              className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>

        <h3 className="display mt-4 text-lg font-semibold leading-snug">
          {material.title}
        </h3>
        {isPaid && material.pricingNote && (
          <p className="mt-1.5 text-xs font-medium text-primary">
            Paid · {material.pricingNote}
          </p>
        )}
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-muted-foreground">
          {material.description}
        </p>

        <p className="mt-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          Filed by {material.contributorName}
        </p>

        <div className="mt-3 space-y-2">
          {action}
          {playlistId && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setOpen(true)}
            >
              Preview here
            </Button>
          )}
        </div>
      </div>

      {/* Book reader / notes reader / video player */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="display pr-6 text-xl leading-snug">
              {material.title}
            </DialogTitle>
            <DialogDescription>
              {readerUrl
                ? "OpenStax web reader"
                : playlistId
                  ? "Video series"
                  : "Study notes"}{' '}· filed by {material.contributorName}
            </DialogDescription>
          </DialogHeader>
          {readerUrl && (
            <>
              <div className="h-[65vh] w-full overflow-hidden rounded-md border border-border">
                <iframe
                  className="h-full w-full"
                  src={readerUrl}
                  title={material.title}
                  loading="lazy"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Reading in the free OpenStax web reader. The downloadable PDF is
                on the{' '}
                <a
                  className="text-primary underline-offset-4 hover:underline"
                  href={openStaxPdfPageUrl(readerUrl) ?? "https://openstax.org/subjects"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  book's details page
                </a>
                .
              </p>
            </>
          )}
          {!readerUrl && playlistId && (
            <div className="aspect-video w-full overflow-hidden rounded-md border border-border">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}`}
                title={material.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
          )}
          <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
            {material.description}
          </p>
          <DialogFooter className="border-t border-border/60 pt-4">
            <p className="text-xs text-muted-foreground">
              From the shelves of the house — share freely with other members.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
