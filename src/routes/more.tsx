import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ChevronRight, RefreshCw } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { PageTitle, SegmentedPill } from "@/components/primitives";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useSales } from "@/hooks/use-sales";
import { supabase } from "@/integrations/supabase/client";
import { balanceDue, formatMoney, isExpired, isRefunded } from "@/lib/sale-utils";
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

const THEMES = [
  { id: "light" as const, label: "Light" },
  { id: "dark" as const, label: "Dark" },
];

function MorePage() {
  const { data: sales = [] } = useSales();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const customerCount = useMemo(
    () => new Set(sales.map((s) => s.customerName.trim().toLowerCase()).filter(Boolean)).size,
    [sales],
  );
  const dealerCount = useMemo(
    () => new Set(sales.map((s) => s.buyerName.trim().toLowerCase()).filter(Boolean)).size,
    [sales],
  );
  const totalDue = useMemo(
    () => sales.reduce((sum, s) => sum + (isRefunded(s) ? 0 : balanceDue(s)), 0),
    [sales],
  );
  const expiredCount = useMemo(() => sales.filter((s) => isExpired(s)).length, [sales]);

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
    onSuccess: (r) => toast.success(`Synced ${r.total} sales across ${r.users} user(s)`),
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

  const links: Array<{
    to: "/customers" | "/dealers" | "/collections" | "/archive" | "/links";
    label: string;
    sub: string;
  }> = [
    {
      to: "/customers",
      label: "Customers",
      sub: `${customerCount} ${customerCount === 1 ? "person" : "people"}`,
    },
    {
      to: "/dealers",
      label: "Dealers",
      sub: `${dealerCount} ${dealerCount === 1 ? "dealer" : "dealers"}`,
    },
    {
      to: "/collections",
      label: "Dues",
      sub: totalDue > 0 ? `${formatMoney(totalDue)} outstanding` : "All clear",
    },
    {
      to: "/archive",
      label: "Archive",
      sub: `${expiredCount} expired sale${expiredCount === 1 ? "" : "s"}`,
    },
    { to: "/links", label: "Shared links", sub: "Collaborate privately" },
  ];

  return (
    <AppLayout>
      <PageTitle className="mt-7" title="More" sub="Tools & settings" />

      <div className="mt-[22px] flex items-center justify-between border-y border-border border-b-hairline py-[18px]">
        <div>
          <div className="text-[15px] font-bold">Appearance</div>
          <div className="mt-0.5 text-[12px] text-muted-foreground">
            {theme === "dark" ? "Dark mode" : "Light mode"}
          </div>
        </div>
        <SegmentedPill options={THEMES} value={theme} onChange={setTheme} />
      </div>

      <ul>
        {links.map((l) => (
          <li key={l.to}>
            <Link
              to={l.to}
              className="flex items-center justify-between gap-3 border-b border-hairline py-[18px]"
            >
              <div className="min-w-0">
                <div className="text-[15px] font-bold">{l.label}</div>
                <div className="mt-0.5 truncate text-[12px] text-muted-foreground">{l.sub}</div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-faint" strokeWidth={2.2} />
            </Link>
          </li>
        ))}
        {adminData?.isAdmin && (
          <ActionRow
            label="Sync to Google Sheet"
            sub="Export every sale"
            pending={backfill.isPending}
            onClick={() => backfill.mutate()}
          />
        )}
        <ActionRow
          label="Sync to backup DB"
          sub="Copy to second project"
          pending={backupBackfill.isPending}
          onClick={() => backupBackfill.mutate()}
        />
      </ul>

      <Button
        variant="outline"
        className="mt-7 h-[50px] w-full text-[14px] text-destructive hover:text-destructive"
        onClick={signOut}
      >
        Sign out
      </Button>

      <div className="mt-[22px] text-center text-[11px] font-semibold text-faint">
        ProfitAI · Resale Ledger · v3.0
        {user?.email && <div className="mt-0.5">{user.email}</div>}
      </div>
    </AppLayout>
  );
}

function ActionRow({
  label,
  sub,
  pending,
  onClick,
}: {
  label: string;
  sub: string;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        disabled={pending}
        onClick={onClick}
        className="flex w-full items-center justify-between gap-3 border-b border-hairline py-[18px] text-left disabled:opacity-60"
      >
        <div className="min-w-0">
          <div className="text-[15px] font-bold">{label}</div>
          <div className="mt-0.5 truncate text-[12px] text-muted-foreground">{sub}</div>
        </div>
        {pending ? (
          <RefreshCw className="size-4 shrink-0 animate-spin text-faint" />
        ) : (
          <ChevronRight className={cn("size-4 shrink-0 text-faint")} strokeWidth={2.2} />
        )}
      </button>
    </li>
  );
}
