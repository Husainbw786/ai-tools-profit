import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Home,
  FileText,
  BarChart3,
  MoreHorizontal,
  Plus,
  ArrowUp,
  Moon,
  Sun,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";
import { SaleSheet } from "@/components/SaleSheet";
import { DataStatus } from "@/components/DataStatus";
import { Bone, SkeletonRows, SkeletonStats } from "@/components/skeletons";
import { onNewSale, openNewSale } from "@/lib/new-sale-bus";

const desktopNav = [
  { to: "/", label: "Dashboard", match: ["/"] },
  { to: "/sales", label: "Active", match: ["/sales"] },
  { to: "/insights", label: "Insights", match: ["/insights"] },
  { to: "/collections", label: "Dues", match: ["/collections"] },
  { to: "/customers", label: "Customers", match: ["/customers", "/customer/"] },
  { to: "/dealers", label: "Dealers", match: ["/dealers", "/dealer/"] },
  { to: "/archive", label: "Archive", match: ["/archive"] },
] as const;

const MORE_PATHS = [
  "/more",
  "/customers",
  "/dealers",
  "/archive",
  "/links",
  "/collections",
  "/customer/",
  "/dealer/",
];

function matches(pathname: string, patterns: readonly string[]) {
  return patterns.some((p) =>
    p.endsWith("/") && p !== "/" ? pathname.startsWith(p) : pathname === p,
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  useEffect(() => onNewSale(() => setDialogOpen(true)), []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const moreActive = matches(pathname, MORE_PATHS);
  const ready = !loading && !!session;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop header — the phone design has none; wide screens get a
          hairline header with text-tab navigation. */}
      <header className="sticky top-0 z-40 hidden border-b border-border bg-background/95 backdrop-blur md:block">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5 py-4">
            <span className="grid size-9 place-items-center rounded-[10px] bg-primary text-white">
              <ArrowUp className="size-5" strokeWidth={2.6} />
            </span>
            <span className="font-display text-[20px] font-medium tracking-[-0.02em]">
              ProfitAI
            </span>
          </Link>
          <nav className="flex items-center gap-6 self-stretch">
            {desktopNav.map((n) => {
              const active = matches(pathname, n.match);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "flex items-center border-b-2 text-[13px] font-bold transition-colors",
                    active
                      ? "border-foreground text-foreground"
                      : "border-transparent text-faint hover:text-muted-foreground",
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex shrink-0 items-center gap-2 py-3">
            <button
              type="button"
              onClick={() => openNewSale()}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 text-[13px] font-bold text-white transition hover:bg-primary/90"
            >
              <Plus className="size-3.5" strokeWidth={2.6} /> Add
            </button>
            <button
              type="button"
              onClick={toggle}
              title="Toggle theme"
              aria-label="Toggle theme"
              className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <button
              type="button"
              onClick={signOut}
              title="Sign out"
              aria-label="Sign out"
              className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-6 pb-[120px] md:pb-16 md:pt-4">
        {ready ? (
          <>
            <DataStatus />
            {children}
          </>
        ) : (
          <ShellSkeleton />
        )}
      </main>

      {/* Mobile bottom navigation: 5 columns, icons only, centre FAB. */}
      <nav
        aria-label="Primary"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden"
      >
        <div
          aria-hidden
          className="h-[30px]"
          style={{ background: "linear-gradient(to top, var(--background) 60%, transparent)" }}
        />
        <div className="pointer-events-auto mx-auto grid max-w-2xl grid-cols-[1fr_1fr_64px_1fr_1fr] items-end border-t border-border bg-background px-6 pb-[max(env(safe-area-inset-bottom),28px)] pt-3.5 text-faint">
          <NavTab to="/" label="Home" icon={Home} active={pathname === "/"} />
          <NavTab to="/sales" label="Sales" icon={FileText} active={pathname === "/sales"} />
          <button
            type="button"
            onClick={() => openNewSale()}
            aria-label="New sale"
            className="mx-auto -mt-[30px] grid size-[52px] place-items-center rounded-full bg-primary text-white shadow-[var(--shadow-fab)] transition active:scale-95"
          >
            <Plus className="size-6" strokeWidth={2.4} />
          </button>
          <NavTab
            to="/insights"
            label="Insights"
            icon={BarChart3}
            active={pathname === "/insights"}
          />
          <NavTab to="/more" label="More" icon={MoreHorizontal} active={moreActive} />
        </div>
      </nav>

      {ready && <SaleSheet open={dialogOpen} onOpenChange={setDialogOpen} sale={null} />}
    </div>
  );
}

/** What SSR emits and what the user sees while the session is being restored. */
function ShellSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your ledger">
      <div className="flex items-center justify-between pt-5 md:pt-2">
        <Bone className="size-9 rounded-full" />
        <Bone className="h-9 w-[110px] rounded-full" />
      </div>
      <Bone className="mt-[34px] h-[13px] w-[72px]" />
      <Bone className="mt-3 h-[54px] w-[220px] rounded-[12px]" />
      <Bone className="mt-3 h-[13px] w-[180px]" />
      <SkeletonStats className="mt-8" />
      <SkeletonRows className="mt-6" count={3} />
    </div>
  );
}

function NavTab({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "grid place-items-center py-1 transition-colors",
        active ? "text-foreground" : "text-faint active:text-muted-foreground",
      )}
    >
      <Icon className="size-6" strokeWidth={2} />
    </Link>
  );
}
