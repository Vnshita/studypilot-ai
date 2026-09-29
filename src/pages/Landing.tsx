import { useAuth } from "@/hooks/use-auth";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ProgramCard } from "@/components/ProgramCard";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  Feather,
  MessageSquareText,
  PenLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router";

const PILLARS = [
  {
    icon: PenLine,
    title: "Written work, marked by hand",
    body: "Every program is built around submissions your tutor reads, marks, and returns. Feedback lands while the argument is still warm, not after the examination.",
  },
  {
    icon: CalendarClock,
    title: "One tutor, the whole way",
    body: "You are assigned a senior tutor at enrollment and keep them. Sessions are scheduled around your calendar — including evenings and Saturdays.",
  },
  {
    icon: ShieldCheck,
    title: "Measured outcomes",
    body: "We keep records of every goal, submission, and revision. You can see exactly how far you have come, and precisely what comes next.",
  },
] as const;

const NUMBERS = [
  { value: "11", label: "years in session" },
  { value: "1,900+", label: "students guided" },
  { value: "94%", label: "first-attempt pass rate" },
  { value: "4.9", label: "member rating" },
] as const;

const METHOD = [
  {
    step: "I",
    title: "A considered placement",
    body: "Before anything is purchased, a senior tutor reviews your goals and current work, and recommends the program — if any — that genuinely fits.",
  },
  {
    step: "II",
    title: "Structured terms",
    body: "Programs run in defined terms with weekly sessions, set readings, and written submissions. Momentum comes from structure, not willpower.",
  },
  {
    step: "III",
    title: "The Society",
    body: "Between sessions you study alongside other members: shared notes, careful discussion, and tutors who answer in the same week.",
  },
] as const;

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const featured = useQuery(api.programs.listPublished, {}) ?? [];

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="paper-texture relative overflow-hidden">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:pb-28 lg:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <p className="eyebrow text-primary">Est. 2015 — Private study society</p>
            <h1 className="display mt-5 text-4xl font-semibold leading-[1.08] sm:text-5xl lg:text-[3.6rem]">
              Serious study, quietly conducted.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              Alcove pairs ambitious learners with senior tutors and structured
              programs in mathematics, the sciences, and the written arts. Small
              cohorts, marked work, and a society that takes the long view.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="gap-2 px-6">
                <Link to="/catalog">
                  Browse the catalog
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="px-6">
                <Link to={isAuthenticated ? "/dashboard" : "/auth?returnTo=%2Fdashboard"}>
                  {isAuthenticated ? "My studies" : "Become a member"}
                </Link>
              </Button>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              Admission is limited to one hundred members per term.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            className="relative"
          >
            <div className="rounded-lg border border-border bg-card p-7 shadow-[0_24px_48px_-24px_oklch(0.29_0.059_38/0.28)]">
              <p className="eyebrow text-muted-foreground">This term at the house</p>
              <ul className="mt-5 space-y-4">
                {[
                  { time: "Mon 6:00 PM", text: "Advanced Proof Techniques — Seminar IV" },
                  { time: "Tue 5:30 PM", text: "One-on-one: Dr. Ellery, differential equations" },
                  { time: "Wed 7:00 PM", text: "The Long Essay — Workshop draft reviews" },
                ].map((row) => (
                  <li
                    key={row.time}
                    className="flex items-start gap-3 border-b border-border/60 pb-4 last:border-0 last:pb-0"
                  >
                    <span className="mt-0.5 rounded-sm bg-secondary px-2 py-1 text-[11px] font-semibold text-secondary-foreground">
                      {row.time}
                    </span>
                    <span className="text-sm leading-6 text-foreground">{row.text}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex items-center justify-between rounded-md bg-secondary/60 px-4 py-3">
                <span className="text-sm text-muted-foreground">Membership terms</span>
                <span className="display text-sm font-semibold">From $280 / program</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Numbers */}
      <section className="border-y border-border/80 bg-primary text-primary-foreground">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 lg:grid-cols-4">
          {NUMBERS.map((item) => (
            <div key={item.label} className="text-center lg:text-left">
              <p className="display text-4xl font-semibold">{item.value}</p>
              <p className="mt-1.5 text-sm text-primary-foreground/75">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <p className="eyebrow text-primary">Why members stay</p>
          <h2 className="display mt-3 text-3xl font-semibold sm:text-4xl">
            The discipline of a good tutor, without the guesswork
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PILLARS.map((pillar) => (
            <div
              key={pillar.title}
              className="rounded-lg border border-border/80 bg-card p-7"
            >
              <div className="flex size-11 items-center justify-center rounded-md bg-secondary text-primary">
                <pillar.icon className="size-5" />
              </div>
              <h3 className="display mt-5 text-lg font-semibold">{pillar.title}</h3>
              <p className="mt-2.5 text-sm leading-7 text-muted-foreground">{pillar.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured programs */}
      <section className="border-t border-border/80 bg-secondary/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="eyebrow text-primary">The catalog</p>
              <h2 className="display mt-3 text-3xl font-semibold sm:text-4xl">
                Programs in session this term
              </h2>
            </div>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/catalog">
                View all programs
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {(featured ?? []).slice(0, 3).map((program) => (
              <ProgramCard key={program._id} program={program} />
            ))}
          </div>
        </div>
      </section>

      {/* Method */}
      <section id="method" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <p className="eyebrow text-primary">The method</p>
          <h2 className="display mt-3 text-3xl font-semibold sm:text-4xl">
            Three principles, observed since 2015
          </h2>
        </div>
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {METHOD.map((item) => (
            <div key={item.step} className="border-t-2 border-primary/80 pt-6">
              <p className="display text-2xl font-semibold text-primary">{item.step}</p>
              <h3 className="display mt-3 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2.5 text-sm leading-7 text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Community strip */}
      <section id="tutors" className="border-y border-border/80 bg-card">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow text-primary">The Society</p>
            <h2 className="display mt-3 text-3xl font-semibold sm:text-4xl">
              Study is easier in good company
            </h2>
            <p className="mt-4 max-w-lg text-base leading-8 text-muted-foreground">
              Members share annotated notes from every program, compare
              approaches before an examination, and book one-on-one sessions
              with the tutor they already know. Conversation is moderated to
              stay useful — closer to a senior common room than a forum.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild variant="outline" className="gap-2">
                <Link to="/community">
                  <MessageSquareText className="size-4" />
                  Visit the study notes
                </Link>
              </Button>
              <Button asChild variant="ghost" className="gap-2">
                <Link to="/book">
                  <CalendarClock className="size-4" />
                  Book a tutor
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: Feather,
                quote:
                  "My tutor returned my essay with more ink than I had written. I have never improved faster.",
                who: "Member since 2023 — The Long Essay",
              },
              {
                icon: BookOpen,
                quote:
                  "The problem sets are hard in exactly the right way. Nobody lets you quietly skip the difficult step.",
                who: "Member since 2022 — Advanced Proof Techniques",
              },
              {
                icon: Sparkles,
                quote:
                  "I came for one program and stayed for the people. The Saturday reading circle alone is worth it.",
                who: "Member since 2024 — Close Reading Clinic",
              },
              {
                icon: PenLine,
                quote:
                  "Booking a session before an exam is the calmest hour of my term.",
                who: "Member since 2023 — Statistical Judgment",
              },
            ].map((item) => (
              <figure
                key={item.who}
                className="flex h-full flex-col rounded-lg border border-border/80 bg-background p-6"
              >
                <item.icon className="size-5 text-primary" />
                <blockquote className="mt-4 flex-1 text-sm leading-7 text-foreground">
                  “{item.quote}”
                </blockquote>
                <figcaption className="mt-4 text-xs text-muted-foreground">
                  {item.who}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Membership CTA */}
      <section id="membership" className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6">
        <div className="rounded-lg border border-border/80 bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12">
          <p className="eyebrow text-primary-foreground/70">Membership</p>
          <h2 className="display mx-auto mt-4 max-w-2xl text-3xl font-semibold sm:text-4xl">
            Take a place at the house this term
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-primary-foreground/80">
            Programs enroll from $280, one-on-one tutoring from $45 per session,
            and every membership includes the society — notes, discussion, and
            priority booking.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" variant="secondary" className="px-7">
              <Link to={isAuthenticated ? "/catalog" : "/auth?returnTo=%2Fcatalog"}>
                {isAuthenticated ? "Choose a program" : "Join the society"}
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 bg-transparent px-7 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link to="/catalog">Browse first</Link>
            </Button>
          </div>
          <p className="mt-6 text-xs text-primary-foreground/60">
            Programs are priced individually. No subscription; you pay for the
            term you study.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
