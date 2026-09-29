import { Badge } from "@/components/ui/badge";
import { formatPriceCents } from "@/lib/format";
import { Clock, Layers, Users } from "lucide-react";
import { Link } from "react-router";

export interface ProgramCardData {
  _id: string;
  title: string;
  discipline: string;
  level: string;
  priceCents: number;
  summary: string;
  instructor: string;
  sessionCount: number;
  durationMinutes: number;
}

export function ProgramCard({ program }: { program: ProgramCardData }) {
  return (
    <Link
      to={`/programs/${program._id}`}
      className="group flex h-full flex-col rounded-lg border border-border/80 bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_12px_32px_-16px_oklch(0.29_0.059_38/0.25)]"
    >
      <div className="flex items-center justify-between gap-2">
        <Badge variant="secondary" className="font-medium">
          {program.discipline}
        </Badge>
        <span className="display text-lg font-semibold text-foreground">
          {formatPriceCents(program.priceCents)}
        </span>
      </div>

      <h3 className="display mt-4 text-xl font-semibold leading-snug text-foreground">
        {program.title}
      </h3>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
        {program.summary}
      </p>

      <div className="mt-auto pt-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/60 pt-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" />
            {program.instructor}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Layers className="size-3.5" />
            {program.sessionCount} sessions
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" />
            {program.durationMinutes} min
          </span>
        </div>
        <p className="mt-3 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          View program →
        </p>
      </div>
    </Link>
  );
}
