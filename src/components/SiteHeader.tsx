import { useAuth } from "@/hooks/use-auth";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { formatPriceCents } from "@/lib/format";
import { Loader2, LogOut } from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router";

const NAV_ITEMS = [
  { to: "/catalog", label: "Catalog" },
  { to: "/dashboard", label: "My Studies" },
  { to: "/community", label: "Society" },
  { to: "/messages", label: "Messages" },
  { to: "/book", label: "Tutoring" },
] as const;

export function SiteHeader() {
  const { isLoading, isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const signInHref = `/auth?returnTo=${encodeURIComponent(
    `${location.pathname}${location.search}`,
  )}`;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Brand />

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-secondary font-medium text-secondary-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          {user?.role === "admin" && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-secondary font-medium text-secondary-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`
              }
            >
              Admin
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : isAuthenticated ? (
            <>
              <span className="hidden text-xs text-muted-foreground lg:block">
                {user?.name || user?.email || "Member"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={handleSignOut}
              >
                <LogOut className="size-3.5" />
                Sign out
              </Button>
            </>
          ) : (
            <>
              <span className="hidden text-sm text-muted-foreground sm:block">
                Enrollment from {formatPriceCents(28000)}
              </span>
              <Button asChild size="sm" className="gap-2">
                <Link to={signInHref}>Sign in</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto border-t border-border/60 px-4 py-2 md:hidden">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors ${
                isActive
                  ? "bg-secondary font-medium text-secondary-foreground"
                  : "text-muted-foreground"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
        {user?.role === "admin" && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors ${
                isActive
                  ? "bg-secondary font-medium text-secondary-foreground"
                  : "text-muted-foreground"
              }`
            }
          >
            Admin
          </NavLink>
        )}
      </nav>
    </header>
  );
}
