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
  LayoutDashboard,
  Package,
  Archive,
  Link2,
  Wallet,
  Users,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SaleDialog } from "@/components/SaleDialog";
import { onNewSale, openNewSale } from "@/lib/new-sale-bus";

const desktopNav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sales", label: "Active", icon: Package },
  { to: "/insights", label: "Insights", icon: BarChart3 },
  { to: "/collections", label: "Dues", icon: Wallet },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/dealers", label: "Dealers", icon: Truck },
  { to: "/archive", label: "Archive", icon: Archive },
  { to: "/links", label: "Links", icon: Link2 },
] as const;

const mobileNav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/sales", label: "Sales", icon: FileText },
  { to: "/insights", label: "Insights", icon: BarChart3 },
  { to: "/more", label: "More", icon: MoreHorizontal },
] as const;

export function AppLayout({
  children,
  rightSlot,
}: {
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  const { pathname } = useLocation();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  useEffect(() => onNewSale(() => setDialogOpen(true)), []);

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
    <div className="min-h-screen bg-background text-foreground pb-32 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3.5">
          <Link to="/" className="group flex min-w-0 items-center gap-2.5">
            <span
              className="grid size-9 shrink-0 place-items-center rounded-2xl text-primary-foreground shadow-[var(--shadow-elegant)]"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              <ArrowUp className="size-5" strokeWidth={2.75} />
            </span>
            <div className="leading-tight">
              <div className="font-display text-[17px] font-bold tracking-tight">
                ProfitAI
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-1.5">
            <nav className="hidden items-center gap-1 rounded-full border border-border/70 bg-card p-1 shadow-[var(--shadow-soft)] md:flex">
              {desktopNav.map((n) => {
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
            {rightSlot}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              title="Toggle theme"
              className="size-9 rounded-full border border-border/70 bg-card text-muted-foreground hover:text-foreground"
            >
              {theme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              title="Sign out"
              className="hidden size-9 rounded-full text-muted-foreground hover:text-foreground md:inline-flex"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 md:py-8">{children}</main>

      {/* Mobile bottom navigation with center FAB */}
      <nav className="fixed inset-x-0 bottom-0 z-40 md:hidden">
        <div
          className="pointer-events-none absolute inset-x-0 -top-8 h-8"
          style={{
            background:
              "linear-gradient(to top, var(--color-background), transparent)",
          }}
        />
        <div className="mx-auto max-w-md px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1">
          <div className="relative">
            <div className="flex items-end justify-between gap-1 rounded-[28px] border border-border/70 bg-card/95 px-2 py-2.5 shadow-[var(--shadow-elegant)] backdrop-blur-xl">
              {mobileNav.slice(0, 2).map((n) => (
                <NavTab key={n.to} item={n} active={pathname === n.to} />
              ))}
              {/* spacer for the FAB */}
              <div className="w-14 shrink-0" aria-hidden />
              {mobileNav.slice(2).map((n) => (
                <NavTab
                  key={n.to}
                  item={n}
                  active={
                    pathname === n.to ||
                    (n.to === "/more" &&
                      ["/more", "/customers", "/dealers", "/archive", "/links", "/collections"].includes(
                        pathname,
                      ))
                  }
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => openNewSale()}
              aria-label="New sale"
              className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[44%] grid size-[58px] place-items-center rounded-full text-primary-foreground shadow-[var(--shadow-elegant)] ring-4 ring-background transition active:scale-95"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              <Plus className="size-7" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </nav>

      <SaleDialog open={dialogOpen} onOpenChange={setDialogOpen} sale={null} />
    </div>
  );
}

function NavTab({
  item,
  active,
}: {
  item: { to: string; label: string; icon: React.ComponentType<{ className?: string }> };
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1 text-[10px] font-semibold transition-colors",
        active ? "text-primary" : "text-muted-foreground active:scale-95",
      )}
    >
      <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 1.9} />
      <span>{item.label}</span>
    </Link>
  );
}