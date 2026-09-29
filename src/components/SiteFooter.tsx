import { Brand } from "@/components/Brand";
import { Link } from "react-router";

const COLUMNS: Array<{ title: string; links: Array<{ label: string; to: string }> }> = [
  {
    title: "Programs",
    links: [
      { label: "Browse the catalog", to: "/catalog" },
      { label: "Private tutoring", to: "/book" },
      { label: "Membership", to: "/dashboard" },
    ],
  },
  {
    title: "The Society",
    links: [
      { label: "Study notes", to: "/community" },
      { label: "Member directory", to: "/community" },
      { label: "Messages", to: "/messages" },
    ],
  },
  {
    title: "The House",
    links: [
      { label: "Our method", to: "/#method" },
      { label: "Tutors", to: "/#tutors" },
      { label: "Membership terms", to: "/#membership" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/80 bg-card">
      <div className="mx-auto w-full max-w-6xl px-4 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-3">
            <Brand />
            <p className="max-w-xs text-sm leading-6 text-muted-foreground">
              A quiet house of study for disciplined learners — private
              tutoring, structured programs, and a society that takes the work
              seriously.
            </p>
          </div>
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <p className="eyebrow text-muted-foreground">{column.title}</p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-border/70 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Alcove Study Society. All rights reserved.</p>
          <p>Admission is limited to one hundred members per term.</p>
        </div>
      </div>
    </footer>
  );
}
