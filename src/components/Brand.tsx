import logo from "@/assets/logo.svg";
import { Link } from "react-router";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5">
      <img
        src={logo}
        alt="Alcove Study Society"
        className="size-8 rounded-[7px]"
      />
      <span className="flex flex-col leading-none">
        <span className="display text-[17px] font-semibold text-foreground">
          Alcove
        </span>
        {!compact && (
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Study Society
          </span>
        )}
      </span>
    </Link>
  );
}
