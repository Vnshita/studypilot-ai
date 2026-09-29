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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { formatPriceCents, formatSessionTimeShort } from "@/lib/format";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  BookMarked,
  BookOpen,
  GraduationCap,
  HandCoins,
  Loader2,
  Plus,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

const EMPTY_FORM = {
  title: "",
  discipline: "",
  level: "Intermediate",
  price: "",
  summary: "",
  description: "",
  instructor: "",
  sessionCount: "8",
  durationMinutes: "60",
  tags: "",
};

export default function Admin() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-xl px-4 py-32 text-center">
          <p className="display text-2xl font-semibold">
            The registrar's office is private
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This area is reserved for administrators. If you believe you should
            have access, write to the registrar.
          </p>
          <Button asChild className="mt-6">
            <Link to="/dashboard">Back to my studies</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <p className="eyebrow text-primary">Registrar's office</p>
        <h1 className="display mt-2 text-3xl font-semibold">Administration</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Programs, enrollments, and the member roster.
        </p>

        <Tabs defaultValue="programs" className="mt-8">
          <TabsList>
            <TabsTrigger value="programs" className="gap-1.5">
              <BookOpen className="size-3.5" />
              Programs
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-1.5">
              <GraduationCap className="size-3.5" />
              Enrollments
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-1.5">
              <Users className="size-3.5" />
              Members
            </TabsTrigger>
            <TabsTrigger value="library" className="gap-1.5">
              <BookMarked className="size-3.5" />
              Library
            </TabsTrigger>
            <TabsTrigger value="payouts" className="gap-1.5">
              <HandCoins className="size-3.5" />
              Payouts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="programs" className="mt-6">
            <ProgramsTab />
          </TabsContent>
          <TabsContent value="orders" className="mt-6">
            <OrdersTab />
          </TabsContent>
          <TabsContent value="members" className="mt-6">
            <MembersTab />
          </TabsContent>
          <TabsContent value="library" className="mt-6">
            <LibraryAdminTab />
          </TabsContent>
          <TabsContent value="payouts" className="mt-6">
            <PayoutsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Programs
// ---------------------------------------------------------------------------

function ProgramsTab() {
  const programs = useQuery(api.programs.listAll, {});
  const createProgram = useMutation(api.programs.create);
  const removeProgram = useMutation(api.programs.remove);

  const [form, setForm] = useState(EMPTY_FORM);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set =
    (key: keyof typeof EMPTY_FORM) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: event.target.value }));

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await createProgram({
        title: form.title,
        discipline: form.discipline,
        level: form.level,
        priceCents: Math.round(parseFloat(form.price || "0") * 100),
        summary: form.summary,
        description: form.description,
        instructor: form.instructor,
        sessionCount: parseInt(form.sessionCount, 10) || 1,
        durationMinutes: parseInt(form.durationMinutes, 10) || 60,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        status: "published",
      });
      toast.success("Program added to the catalog.");
      setForm(EMPTY_FORM);
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not add the program.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeProgram({ id: id as never });
      toast.success("Program removed from the catalog.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not remove the program.",
      );
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Catalog</CardTitle>
          <CardDescription>
            Programs appear in the catalog immediately.
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="size-3.5" />
              Add program
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New program</DialogTitle>
              <DialogDescription>
                Set the details members will see in the catalog.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-title">Title</Label>
                <Input id="p-title" value={form.title} onChange={set("title")} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="p-discipline">Discipline</Label>
                  <Input
                    id="p-discipline"
                    value={form.discipline}
                    onChange={set("discipline")}
                    placeholder="Mathematics"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-level">Level</Label>
                  <Input
                    id="p-level"
                    value={form.level}
                    onChange={set("level")}
                    placeholder="Intermediate"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="p-price">Price ($)</Label>
                  <Input
                    id="p-price"
                    inputMode="decimal"
                    value={form.price}
                    onChange={set("price")}
                    placeholder="420"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-sessions">Sessions</Label>
                  <Input
                    id="p-sessions"
                    inputMode="numeric"
                    value={form.sessionCount}
                    onChange={set("sessionCount")}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-duration">Minutes</Label>
                  <Input
                    id="p-duration"
                    inputMode="numeric"
                    value={form.durationMinutes}
                    onChange={set("durationMinutes")}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-instructor">Tutor</Label>
                <Input
                  id="p-instructor"
                  value={form.instructor}
                  onChange={set("instructor")}
                  placeholder="Dr. Margot Ellery"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-summary">Summary</Label>
                <Input
                  id="p-summary"
                  value={form.summary}
                  onChange={set("summary")}
                  placeholder="One sentence for the catalog card"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-description">Description</Label>
                <Textarea
                  id="p-description"
                  value={form.description}
                  onChange={set("description")}
                  rows={4}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-tags">Tags (comma-separated)</Label>
                <Input
                  id="p-tags"
                  value={form.tags}
                  onChange={set("tags")}
                  placeholder="proof writing, seminar"
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Add program
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {programs === undefined || programs === null ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : programs.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            The catalog is empty. Add the first program.
          </p>
        ) : (
          <ul className="divide-y divide-border/70">
            {programs.map((program) => (
              <li
                key={program._id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{program.title}</p>
                    <Badge
                      variant={program.status === "published" ? "secondary" : "outline"}
                    >
                      {program.status}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {program.discipline} · {program.level} · {program.instructor} ·{" "}
                    {program.sessionCount} sessions
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">
                    {formatPriceCents(program.priceCents)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(program._id)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

function OrdersTab() {
  const orders = useQuery(api.store.listRecent, {});
  const refund = useAction(api.payments.refundWithStripe);

  const handleRefund = async (orderId: string) => {
    try {
      const result = await refund({ orderId: orderId as never });
      toast.success(
        result?.stripeRefunded
          ? "Refunded through Stripe and access revoked."
          : "Refunded in the ledger and access revoked.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not refund the order.",
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent enrollments</CardTitle>
        <CardDescription>
          The twenty-five most recent orders across all programs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {orders === undefined ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            No enrollments yet.
          </p>
        ) : (
          <ul className="divide-y divide-border/70">
            {orders.map((order) => (
              <OrderRow key={order._id} orderId={order._id} onRefund={handleRefund} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function OrderRow({
  orderId,
  onRefund,
}: {
  orderId: string;
  onRefund: (orderId: string) => void;
}) {
  const order = useQuery(api.store.getOrder, { id: orderId as never });
  const program = useQuery(
    api.programs.getById,
    order ? { id: order.programId as never } : "skip",
  );

  if (!order) return null;

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div className="min-w-0">
        <p className="font-medium">
          {program ? program.title : "Program enrollment"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {order.cardLast4 ? `Card ending ${order.cardLast4}` : "Paid via Stripe"} ·{" "}
          {formatSessionTimeShort(order._creationTime)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">
          {formatPriceCents(order.amountCents)}
        </span>
        <Badge
          variant={order.status === "paid" ? "secondary" : "outline"}
        >
          {order.status === "paid"
            ? "Paid"
            : order.status === "pending"
              ? "Pending"
              : "Refunded"}
        </Badge>
        {order.status === "paid" && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onRefund(order._id)}
          >
            Refund
          </Button>
        )}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

function LibraryAdminTab() {
  const materials = useQuery(api.library.listAll, {});
  const removeMaterial = useMutation(api.library.adminRemove);

  const handleRemove = async (id: string) => {
    try {
      await removeMaterial({ id: id as never });
      toast.success("Removed from the shelf.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not remove the item.",
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>The Library</CardTitle>
        <CardDescription>
          Every textbook and note on the shelves, including members'
          contributions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {materials === undefined ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : materials.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            The shelves are empty. Seed content appears when the first member
            joins.
          </p>
        ) : (
          <ul className="divide-y divide-border/70">
            {materials.map((material) => (
              <li
                key={material._id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{material.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {material.discipline} ·{" "}
                    {material.kind === "textbook" ? "Textbook" : "Notes"} · filed
                    by {material.contributorName}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(material._id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

function MembersTab() {
  const members = useQuery(api.admin.listMembers, {});
  const setRole = useMutation(api.roles.setRole);

  const handleSetRole = async (userId: string, role: "admin" | "member") => {
    try {
      await setRole({ userId: userId as never, role });
      toast.success(
        role === "admin" ? "Promoted to administrator." : "Changed to member.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update the role.",
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Member roster</CardTitle>
        <CardDescription>
          Promote trusted colleagues to help run the registrar's office.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {members === undefined ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ul className="divide-y divide-border/70">
            {members.map((member) => (
              <li
                key={member._id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div>
                  <p className="font-medium">
                    {member.name || member.email || "Anonymous member"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {member.email || "No email on file"}
                    {member.isAnonymous ? " · guest" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                    {member.role === "admin"
                      ? "Administrator"
                      : member.role === "member"
                        ? "Member"
                        : "New"}
                  </Badge>
                  {member.role === "admin" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => handleSetRole(member._id, "member")}
                    >
                      Make member
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => handleSetRole(member._id, "admin")}
                    >
                      Make admin
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Teacher payouts
// ---------------------------------------------------------------------------

function PayoutsTab() {
  const duePayouts = useQuery(api.teaching.listDuePayouts, {});
  const markSent = useMutation(api.teaching.markPayoutSent);

  const total = (duePayouts ?? []).reduce(
    (sum, o) => sum + (o.teacherShareCents ?? 0),
    0,
  );

  const handleMarkSent = async (orderId: string) => {
    try {
      await markSent({ orderId: orderId as never });
      toast.success("Payout marked as sent.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not mark the payout.",
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Teacher payouts</CardTitle>
        <CardDescription>
          Every enrollment owes its teacher 70% of the fee. Settle each line
          once you have sent the money — the teacher sees it the moment you do.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {duePayouts === undefined ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : duePayouts.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            No payouts are due. Every teacher has been settled.
          </p>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between rounded-md border border-primary/25 bg-secondary/50 px-4 py-3">
              <p className="eyebrow text-muted-foreground">Owed to teachers</p>
              <p className="display text-lg font-semibold">
                {formatPriceCents(total)}
              </p>
            </div>
            <ul className="divide-y divide-border/70">
              {duePayouts.map((order) => (
                <PayoutRow
                  key={order._id}
                  orderId={order._id}
                  onMarkSent={handleMarkSent}
                />
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PayoutRow({
  orderId,
  onMarkSent,
}: {
  orderId: string;
  onMarkSent: (orderId: string) => void;
}) {
  const order = useQuery(api.store.getOrder, { id: orderId as never });
  const program = useQuery(
    api.programs.getById,
    order ? { id: order.programId as never } : "skip",
  );

  if (!order) return null;

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div className="min-w-0">
        <p className="font-medium">
          {program ? program.title : "Program enrollment"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Enrollment of {formatPriceCents(order.amountCents)} ·{" "}
          {formatSessionTimeShort(order._creationTime)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">
          {formatPriceCents(order.teacherShareCents ?? 0)}
        </span>
        <Button size="sm" variant="outline" onClick={() => onMarkSent(order._id)}>
          Mark paid
        </Button>
      </div>
    </li>
  );
}
