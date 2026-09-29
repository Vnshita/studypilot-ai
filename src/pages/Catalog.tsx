import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ProgramCard } from "@/components/ProgramCard";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Loader2, SearchX, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export default function Catalog() {
  const [search, setSearch] = useState("");
  const [discipline, setDiscipline] = useState<string | null>(null);

  const programs = useQuery(api.programs.listPublished, { search });
  const disciplines = useQuery(api.programs.listDisciplines, {});

  const visible = useMemo(() => {
    if (!programs) return null;
    if (!discipline) return programs;
    return programs.filter((p) => p.discipline === discipline);
  }, [programs, discipline]);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="paper-texture border-b border-border/80">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <p className="eyebrow text-primary">The catalog</p>
          <h1 className="display mt-3 text-4xl font-semibold">
            Programs in session
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Each program runs in a defined term with weekly sessions, marked
            submissions, and a senior tutor. Enrollment is priced per program.
          </p>

          <div className="relative mt-8 max-w-xl">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, discipline, or tutor…"
              className="h-12 rounded-md bg-card pl-10 text-base"
            />
          </div>

          {disciplines && disciplines.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              <FilterChip
                label="All disciplines"
                active={discipline === null}
                onClick={() => setDiscipline(null)}
              />
              {disciplines.map((d) => (
                <FilterChip
                  key={d}
                  label={d}
                  active={discipline === d}
                  onClick={() => setDiscipline(discipline === d ? null : d)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        {visible === null ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center rounded-lg border border-dashed py-20 text-center">
            <SearchX className="size-8 text-muted-foreground" />
            <p className="display mt-4 text-lg font-semibold">
              No programs match that search
            </p>
            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
              Try a broader term — or ask the registrar by booking a placement
              conversation.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {visible.length} {visible.length === 1 ? "program" : "programs"}
              {discipline ? ` in ${discipline}` : ""}
            </p>
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((program) => (
                <ProgramCard key={program._id} program={program} />
              ))}
            </div>
          </>
        )}

        <div className="mt-14 rounded-lg border border-border/80 bg-secondary/50 p-8 text-center">
          <p className="display text-xl font-semibold">
            Not sure which program fits?
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Book a placement conversation and a senior tutor will recommend the
            right starting point.
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link to="/book">Book a placement conversation</Link>
          </Button>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
