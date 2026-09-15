import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Sun,
  User,
  Store,
  AlertCircle,
  Link2,
  Archive,
  RefreshCw,
  ChevronRight,
  DatabaseBackup,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useSales } from "@/hooks/use-sales";
import { useContacts } from "@/hooks/use-contacts";
import { supabase } from "@/integrations/supabase/client";
import { balanceDue, formatMoney } from "@/lib/sale-utils";
import { backfillSalesToSheet, isAdmin } from "@/lib/sales.functions";
import { backfillMyBackup } from "@/lib/backup.functions";

export const Route = createFileRoute("/more")({
  head: () => ({
    meta: [
      { title: "More — ProfitAI" },
      { name: "description", content: "Tools, contacts, archive and settings." },
    ],
  }),
  component: MorePage,
});

function MorePage() {
  const { data: sales = [] } = useSales();
  const { data: contacts = [] } = useContacts();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const customerCount = useMemo(
    () =>
      new Set(
        sales
          .map((s) => s.customerName.trim().toLowerCase())
          .filter(Boolean),
      ).size,
    [sales],
  );
  const dealerCount = useMemo(
    () =>
      new Set(
        sales.map((s) => s.buyerName.trim().toLowerCase()).filter(Boolean),
      ).size,
    [sales],
  );
  const totalDue = useMemo(
    () => sales.reduce((sum, s) => sum + balanceDue(s), 0),
    [sales],
  );

  const isAdminFn = useServerFn(isAdmin);
  const backfillFn = useServerFn(backfillSalesToSheet);
  const backupBackfillFn = useServerFn(backfillMyBackup);
  const { data: adminData } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => isAdminFn(),
    staleTime: 5 * 60_000,
  });
  const backfill = useMutation({
    mutationFn: () => backfillFn(),
    onSuccess: (r) =>
      toast.success(`Synced ${r.total} sales across ${r.users} user(s)`),
    onError: (e: Error) => toast.error(e.message),
  });
  const backupBackfill = useMutation({
    mutationFn: () => backupBackfillFn(),
    onSuccess: (r) =>
      toast.success(
        `Backup synced: ${r.saleCount} sales, ${r.paymentCount} payments, ${r.contactCount} contacts`,
      ),
    onError: (e: Error) => toast.error(e.message),
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  void contacts; // contacts hook keeps cache warm

  const items: Array<{
    to: "/customers" | "/dealers" | "/collections" | "/links" | "/archive";
    label: string;
    sub: string;
    icon: React.ComponentType<{ className?: string }>;
    tint: string;
  }> = [
    {
      to: "/customers",
      label: "Customers",
      sub: `${customerCount} ${customerCount === 1 ? "person" : "people"}`,
      icon: User,
      tint: "bg-primary/10 text-primary",
    },
    {
      to: "/dealers",
      label: "Dealers",
      sub: `${dealerCount} ${dealerCount === 1 ? "dealer" : "dealers"}`,
      icon: Store,
      tint: "bg-primary/10 text-primary",
    },
    {
      to: "/collections",
      label: "Dues",
      sub: totalDue > 0 ? `${formatMoney(totalDue)} outstanding` : "All clear",
      icon: AlertCircle,
      tint: "bg-destructive/10 text-destructive",
    },
    {
      to: "/links",
      label: "Shared links",
      sub: "Collaborate privately",
      icon: Link2,
      tint: "bg-primary/10 text-primary",
    },
    {
      to: "/archive",
      label: "Archive",
      sub: "Expired & completed",
      icon: Archive,
      tint: "bg-muted text-muted-foreground",
    },
  ];

  return (
    <AppLayout>
      <div className="mb-5">
        <h1 className="font-display text-3xl font-bold tracking-tight">More</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">Tools & settings</p>
      </div>

      <Card className="flex items-center justify-between gap-3 border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-primary/15 text-primary">
            <Sun className="size-4" />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Appearance</div>
            <div className="text-[11px] capitalize text-muted-foreground">
              {theme} mode
            </div>
          </div>
        </div>
        <div className="inline-flex rounded-full border border-border bg-secondary/60 p-1 text-xs font-semibold">
          {(["light", "dark"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className={cn(
                "rounded-full px-3 py-1 capitalize transition",
                theme === t
                  ? "bg-card text-foreground shadow-[var(--shadow-soft)]"
                  : "text-muted-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </Card>

      <Card className="mt-4 divide-y divide-border/60 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/50"
            >
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-full",
                  it.tint,
                )}
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{it.label}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {it.sub}
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground/60" />
            </Link>
          );
        })}
        {adminData?.isAdmin && (
          <button
            type="button"
            disabled={backfill.isPending}
            onClick={() => backfill.mutate()}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/50 disabled:opacity-60"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <RefreshCw
                className={cn("size-4", backfill.isPending && "animate-spin")}
              />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">Sync to Sheet</div>
              <div className="text-[11px] text-muted-foreground">
                Export to Google Sheets
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground/60" />
          </button>
        )}
      </Card>

      <Button
        variant="outline"
        className="mt-4 h-12 w-full rounded-2xl border-border/70 bg-card text-sm font-semibold text-destructive shadow-[var(--shadow-soft)] hover:bg-destructive/5 hover:text-destructive"
        onClick={signOut}
      >
        Sign out
      </Button>

      <div className="mt-6 text-center text-[11px] text-muted-foreground">
        ProfitAI · Resale Ledger · v2.0
        {user?.email && <div className="mt-0.5 opacity-70">{user.email}</div>}
      </div>
    </AppLayout>
  );
}