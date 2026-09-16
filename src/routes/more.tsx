import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { PageTitle, SegmentedPill } from "@/components/primitives";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useSales } from "@/hooks/use-sales";
import { supabase } from "@/integrations/supabase/client";
import { balanceDue, formatMoney, isExpired, isRefunded } from "@/lib/sale-utils";

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
  const { data: sales = [], isPending } = useSales();
  const count = (label: string) => (isPending ? "…" : label);
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

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const links: Array<{
    to: "/customers" | "/dealers" | "/collections" | "/archive";
    label: string;
    sub: string;
  }> = [
    {
      to: "/customers",
      label: "Customers",
      sub: count(`${customerCount} ${customerCount === 1 ? "person" : "people"}`),
    },
    {
      to: "/dealers",
      label: "Dealers",
      sub: count(`${dealerCount} ${dealerCount === 1 ? "dealer" : "dealers"}`),
    },
    {
      to: "/collections",
      label: "Dues",
      sub: count(totalDue > 0 ? `${formatMoney(totalDue)} outstanding` : "All clear"),
    },
    {
      to: "/archive",
      label: "Archive",
      sub: count(`${expiredCount} expired sale${expiredCount === 1 ? "" : "s"}`),
    },
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
