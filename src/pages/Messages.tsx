import { SiteHeader } from "@/components/SiteHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { MessageSquare, Send, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

export default function Messages() {
  const { user } = useAuth();
  const conversations = useQuery(api.messaging.listMine, {});
  const members = useQuery(api.messaging.listMembers, {});

  const getOrCreate = useMutation(api.messaging.getOrCreate);

  const [activeId, setActiveId] = useState<string | null>(null);

  const otherIdOf = (participantIds: string[]) =>
    participantIds.find((id) => id !== user?._id) ?? participantIds[0];

  const handleStartConversation = async (otherUserId: string) => {
    try {
      const id = await getOrCreate({ otherUserId: otherUserId as never });
      setActiveId(id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not open the conversation.",
      );
    }
  };

  const nameFor = (otherUserId: string) => {
    const member = members?.find((m) => m._id === otherUserId);
    return member?.name || member?.email || "Member";
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="max-w-2xl">
          <p className="eyebrow text-primary">The Society</p>
          <h1 className="display mt-2 text-3xl font-semibold">Messages</h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Quiet, direct conversation between members. Ask how a program runs,
            compare notes before an examination, or arrange to study together.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="size-4 text-primary" />
                  Members
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-64 space-y-1 overflow-y-auto">
                {members === undefined ? (
                  <Skeleton className="h-8 w-full" />
                ) : members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No other members yet.
                  </p>
                ) : (
                  members.map((member) => (
                    <button
                      key={member._id}
                      type="button"
                      onClick={() => handleStartConversation(member._id)}
                      className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-secondary/70"
                    >
                      <Avatar className="size-7">
                        <AvatarFallback className="text-[10px]">
                          {(member.name || member.email || "M")
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-sm">
                        {member.name || member.email || "Member"}
                      </span>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="size-4 text-primary" />
                  Conversations
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-64 space-y-1 overflow-y-auto">
                {conversations === undefined ? (
                  <Skeleton className="h-8 w-full" />
                ) : conversations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Pick a member to begin.
                  </p>
                ) : (
                  conversations.map((conversation) => {
                    const otherId = otherIdOf(conversation.participantIds);
                    return (
                      <button
                        key={conversation._id}
                        type="button"
                        onClick={() => setActiveId(conversation._id)}
                        className={`flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors ${
                          activeId === conversation._id
                            ? "bg-secondary font-medium text-secondary-foreground"
                            : "hover:bg-secondary/70"
                        }`}
                      >
                        <Avatar className="size-7">
                          <AvatarFallback className="text-[10px]">
                            {nameFor(otherId).slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-sm">
                          {nameFor(otherId)}
                        </span>
                      </button>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Thread */}
          {activeId ? (
            <Thread
              conversationId={activeId}
              otherName={nameFor(otherIdOf(
                conversations?.find((c) => c._id === activeId)?.participantIds ??
                  [],
              ))}
            />
          ) : (
            <Card className="flex min-h-[380px] items-center justify-center">
              <CardContent className="text-center">
                <MessageSquare className="mx-auto size-8 text-muted-foreground" />
                <p className="display mt-4 text-lg font-semibold">
                  Select a conversation
                </p>
                <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
                  Choose a member on the left to begin, or reopen an earlier
                  exchange.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {!user && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link
              to="/auth?returnTo=%2Fmessages"
              className="text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>{" "}
            to read and send messages.
          </p>
        )}
      </main>
    </div>
  );
}

function Thread({
  conversationId,
  otherName,
}: {
  conversationId: string;
  otherName: string;
}) {
  const { user } = useAuth();
  const messages = useQuery(api.messaging.listMessages, {
    conversationId: conversationId as never,
  });
  const send = useMutation(api.messaging.send);

  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(
    () => (messages ? [...messages].sort((a, b) => a._creationTime - b._creationTime) : []),
    [messages],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sorted.length]);

  const handleSend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setIsSending(true);
    try {
      await send({ conversationId: conversationId as never, body: draft });
      setDraft("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not send the message.",
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="flex min-h-[440px] flex-col">
      <CardHeader className="border-b border-border/60">
        <CardTitle className="text-base">{otherName}</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 overflow-y-auto py-5">
        {messages === undefined ? (
          <Skeleton className="h-16 w-2/3" />
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No messages yet. Open with a question — replies here are usually
            quick.
          </p>
        ) : (
          sorted.map((message) => {
            const mine = message.senderId === user?._id;
            return (
              <div
                key={message._id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3.5 py-2.5 text-sm leading-6 ${
                    mine
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {message.body}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </CardContent>

      <CardFooter className="border-t border-border/60 pt-4">
        <form onSubmit={handleSend} className="flex w-full gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a message…"
            className="bg-background"
          />
          <Button type="submit" size="icon" disabled={isSending || !draft.trim()}>
            <Send className="size-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
