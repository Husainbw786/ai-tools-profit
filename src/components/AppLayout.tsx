import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LayoutDashboard, Package, Archive, LogOut, TrendingUp, Link2, Wallet, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sales", label: "Active", icon: Package },
  { to: "/insights", label: "Insights", icon: BarChart3 },
  { to: "/collections", label: "Dues", icon: Wallet },
  { to: "/archive", label: "Archive", icon: Archive },
  { to: "/links", label: "Links", icon: Link2 },
] as const;

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
          <Link to="/" className="group flex items-center gap-2.5">
            <span
              className="grid size-9 place-items-center rounded-xl text-primary-foreground shadow-[var(--shadow-elegant)]"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              <TrendingUp className="size-5" strokeWidth={2.5} />
            </span>
            <div className="leading-tight">
              <div className="font-display text-[15px] font-semibold tracking-tight">
                ProfitAI
              </div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Resale ledger
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <nav className="hidden items-center gap-1 rounded-full border border-border/70 bg-card p-1 shadow-[var(--shadow-soft)] md:flex">
              {nav.map((n) => {
                const active = pathname === n.to;
                const Icon = n.icon;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5" />
                    {n.label}
                  </Link>
                );
              })}
            </nav>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              title="Sign out"
              className="ml-1 rounded-full text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 md:py-8">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 md:hidden">
        <div
          className="pointer-events-none absolute inset-x-0 -top-6 h-6"
          style={{
            background:
              "linear-gradient(to top, var(--color-background), transparent)",
          }}
        />
        <div className="mx-auto max-w-md px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-1">
          <div className="flex items-center justify-around rounded-2xl border border-border/70 bg-card/95 px-2 py-2 shadow-[var(--shadow-elegant)] backdrop-blur-xl">
            {nav.map((n) => {
              const active = pathname === n.to;
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-medium transition-all",
                    active
                      ? "text-primary-foreground"
                      : "text-muted-foreground active:scale-95",
                  )}
                  style={
                    active ? { backgroundImage: "var(--gradient-primary)" } : undefined
                  }
                >
                  <Icon className={cn("size-5", active && "drop-shadow")} />
                  <span>{n.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}