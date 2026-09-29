import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { MessageCircle, NotebookPen, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

export default function Community() {
  const notes = useQuery(api.community.listAll, {});
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        <div className="max-w-2xl">
          <p className="eyebrow text-primary">The Society</p>
          <h1 className="display mt-2 text-3xl font-semibold">Study notes</h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Members write up what they worked through, where the difficulty sat,
            and what finally made it give way. Read generously, reply
            usefully.
          </p>
        </div>

        {notes === undefined ? (
          <div className="mt-10 space-y-4">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
        ) : notes.length === 0 ? (
          <Empty className="mt-10 rounded-lg border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <NotebookPen />
              </EmptyMedia>
              <EmptyTitle>The first note sets the tone</EmptyTitle>
              <EmptyDescription>
                Enroll in a program and share what you are working through — the
                Society reads everything.
              </EmptyDescription>
            </EmptyHeader>
            <Button asChild>
              <Link to="/catalog">Browse the catalog</Link>
            </Button>
          </Empty>
        ) : (
          <ul className="mt-10 space-y-5">
            {notes.map((note) => (
              <NoteCard key={note._id} noteId={note._id} viewerId={user?._id ?? null} />
            ))}
          </ul>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function NoteCard({
  noteId,
  viewerId,
}: {
  noteId: string;
  viewerId: string | null;
}) {
  const note = useQuery(api.community.getById, { id: noteId as never });
  const comments = useQuery(api.community.listComments, { noteId: noteId as never });
  const program = useQuery(
    api.programs.getById,
    note ? { id: note.programId as never } : "skip",
  );

  const addComment = useMutation(api.community.addComment);
  const removeNote = useMutation(api.community.remove);
  const { user } = useAuth();

  const [reply, setReply] = useState("");
  const [isSending, setIsSending] = useState(false);

  if (!note) return null;

  const handleReply = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reply.trim()) return;
    setIsSending(true);
    try {
      await addComment({ noteId: note._id, body: reply });
      setReply("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not post the reply.",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleRemove = async () => {
    try {
      await removeNote({ id: note._id });
      toast.success("Note removed.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not remove the note.",
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {program && (
            <Link
              to={`/programs/${program._id}`}
              className="rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground transition-colors hover:bg-secondary/70"
            >
              {program.title}
            </Link>
          )}
          <span>Study note</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <h2 className="display text-xl font-semibold leading-snug">
            {note.title}
          </h2>
          {note.userId === user?._id && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Remove note"
              onClick={handleRemove}
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
          {note.body}
        </p>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-4 border-t border-border/60 pt-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MessageCircle className="size-3.5" />
          {comments === undefined
            ? "Replies…"
            : `${comments.length} ${comments.length === 1 ? "reply" : "replies"}`}
        </div>

        {comments && comments.length > 0 && (
          <ul className="space-y-3">
            {comments.map((comment) => (
              <li key={comment._id} className="flex gap-3">
                <Avatar className="size-7">
                  <AvatarFallback className="text-[10px]">
                    {comment.userId.slice(-2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 rounded-md bg-secondary/60 px-3.5 py-2.5">
                  <p className="text-sm leading-6 text-foreground">
                    {comment.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {user ? (
          <form onSubmit={handleReply} className="flex gap-2">
            <Input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Add a careful reply…"
              className="bg-background"
            />
            <Button type="submit" size="icon" disabled={isSending || !reply.trim()}>
              {isSending ? (
                "…"
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link to="/auth?returnTo=%2Fcommunity" className="text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>{" "}
            to join the discussion.
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
