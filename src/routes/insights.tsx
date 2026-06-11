import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  endOfMonth,
  startOfMonth,
  subMonths,
} from "date-fns";
import {
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  Store,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useSales } from "@/hooks/use-sales";
import {
  filterByRange,
  formatMoney,
  formatPct,
  type DateRange,
} from "@/lib/sale-utils";
import {
  groupByBuyer,
  groupByCustomer,
  groupByProduct,
  monthlyPnL,
  type Group,
} from "@/lib/insights-utils";
import { downloadFile, monthlyPnLToCSV, monthlyPnLToPDF } from "@/lib/exports";

type Period = "lifetime" | "this-month" | "last-month" | "last-3" | "last-12";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Insights — ProfitAI" },
      { name: "description", content: "Profit insights and P&L reports." },
    ],
  }),
  component: InsightsPage,
});

function InsightsPage() {
  const { data: sales = [] } = useSales();
  const [period, setPeriod] = useState<Period>("lifetime");

  const range: DateRange | null = useMemo(() => {
    const now = new Date();
    if (period === "this-month")
      return { from: startOfMonth(now), to: endOfMonth(now) };
    if (period === "last-month") {
      const lm = subMonths(now, 1);
      return { from: startOfMonth(lm), to: endOfMonth(lm) };
    }
    if (period === "last-3")
      return { from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now) };
    if (period === "last-12")
      return { from: startOfMonth(subMonths(now, 11)), to: endOfMonth(now) };
    return null;
  }, [period]);

  const inRange = useMemo(() => filterByRange(sales, range), [sales, range]);

  const byProduct = useMemo(() => groupByProduct(inRange), [inRange]);
  const byCustomer = useMemo(() => groupByCustomer(inRange), [inRange]);
  const byBuyer = useMemo(() => groupByBuyer(inRange), [inRange]);
  const pnl = useMemo(() => monthlyPnL(inRange), [inRange]);

  const totals = pnl.reduce(
    (acc, r) => {
      acc.revenue += r.revenue;
      acc.cost += r.cost;
      acc.profit += r.profit;
      acc.unpaidAmount += r.unpaidAmount;
      return acc;
    },
    { revenue: 0, cost: 0, profit: 0, unpaidAmount: 0 },
  );

  const exportCSV = () => {
    downloadFile(
      `pnl-${period}.csv`,
      monthlyPnLToCSV(pnl),
      "text/csv;charset=utf-8",
    );
  };

  const exportPDF = async () => {
    await monthlyPnLToPDF(pnl, `pnl-${period}.pdf`);
  };

  return (
    <AppLayout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Insights
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Profit breakdowns & monthly reports
          </p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lifetime">Lifetime</SelectItem>
            <SelectItem value="this-month">This month</SelectItem>
            <SelectItem value="last-month">Last month</SelectItem>
            <SelectItem value="last-3">Last 3 months</SelectItem>
            <SelectItem value="last-12">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard label="Revenue" value={formatMoney(totals.revenue)} />
        <SummaryCard label="Cost" value={formatMoney(totals.cost)} />
        <SummaryCard
          label="Profit"
          value={formatMoney(totals.profit)}
          accent={totals.profit >= 0 ? "success" : "destructive"}
        />
        <SummaryCard
          label="Unpaid"
          value={formatMoney(totals.unpaidAmount)}
          accent="destructive"
        />
      </div>

      <Card className="mt-6 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-display text-base font-semibold tracking-tight">
            Monthly P&amp;L
          </h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportCSV} disabled={!pnl.length}>
              <Download className="size-3.5" /> CSV
            </Button>
            <Button size="sm" variant="outline" onClick={exportPDF} disabled={!pnl.length}>
              <FileText className="size-3.5" /> PDF
            </Button>
          </div>
        </div>
        {pnl.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No sales in this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Month</th>
                  <th className="py-2 pr-3 text-right font-medium">Sales</th>
                  <th className="py-2 pr-3 text-right font-medium">Revenue</th>
                  <th className="py-2 pr-3 text-right font-medium">Cost</th>
                  <th className="py-2 pr-3 text-right font-medium">Profit</th>
                  <th className="py-2 text-right font-medium">Unpaid</th>
                </tr>
              </thead>
              <tbody>
                {pnl.map((r) => (
                  <tr key={r.monthKey} className="border-b border-border/50">
                    <td className="py-2 pr-3 font-medium">{r.monthLabel}</td>
                    <td className="py-2 pr-3 text-right text-muted-foreground">
                      {r.count}
                    </td>
                    <td className="py-2 pr-3 text-right">{formatMoney(r.revenue)}</td>
                    <td className="py-2 pr-3 text-right text-muted-foreground">
                      {formatMoney(r.cost)}
                    </td>
                    <td
                      className={cn(
                        "py-2 pr-3 text-right font-semibold",
                        r.profit >= 0 ? "text-success" : "text-destructive",
                      )}
                    >
                      {formatMoney(r.profit)}
                    </td>
                    <td className="py-2 text-right">
                      {r.unpaidAmount > 0 ? (
                        <span className="text-destructive">
                          {formatMoney(r.unpaidAmount)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-6 p-4">
        <Tabs defaultValue="product">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold tracking-tight">
              Profit breakdown
            </h2>
            <TabsList className="h-8">
              <TabsTrigger value="product" className="text-xs">
                <Package className="mr-1 size-3" /> Product
              </TabsTrigger>
              <TabsTrigger value="customer" className="text-xs">
                <Users className="mr-1 size-3" /> Customer
              </TabsTrigger>
              <TabsTrigger value="buyer" className="text-xs">
                <Store className="mr-1 size-3" /> Dealer
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="product">
            <GroupSections groups={byProduct} />
          </TabsContent>
          <TabsContent value="customer">
            <GroupSections groups={byCustomer} />
          </TabsContent>
          <TabsContent value="buyer">
            <GroupSections groups={byBuyer} />
          </TabsContent>
        </Tabs>
      </Card>
    </AppLayout>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "success" | "destructive";
}) {
  return (
    <Card className="p-3">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 truncate font-display text-lg font-semibold tracking-tight",
          accent === "success" && "text-success",
          accent === "destructive" && "text-destructive",
        )}
      >
        {value}
      </div>
    </Card>
  );
}

function GroupSections({ groups }: { groups: Group[] }) {
  if (groups.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Nothing to show.
      </div>
    );
  }
  const topEarners = [...groups].sort((a, b) => b.profit - a.profit).slice(0, 5);
  const worstMargins = [...groups]
    .filter((g) => g.cost > 0)
    .sort((a, b) => a.marginPct - b.marginPct)
    .slice(0, 5);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <GroupList
        title="Top earners"
        icon={<TrendingUp className="size-3.5 text-success" />}
        rows={topEarners}
        accent="profit"
      />
      <GroupList
        title="Worst margins"
        icon={<TrendingDown className="size-3.5 text-destructive" />}
        rows={worstMargins}
        accent="margin"
      />
    </div>
  );
}

function GroupList({
  title,
  icon,
  rows,
  accent,
}: {
  title: string;
  icon: React.ReactNode;
  rows: Group[];
  accent: "profit" | "margin";
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </div>
      <ul className="space-y-1.5">
        {rows.length === 0 ? (
          <li className="rounded border border-dashed py-3 text-center text-xs text-muted-foreground">
            No data
          </li>
        ) : (
          rows.map((g) => (
            <li
              key={g.key}
              className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{g.key}</div>
                <div className="text-[10px] text-muted-foreground">
                  {g.count} sale{g.count === 1 ? "" : "s"} · {g.units} unit
                  {g.units === 1 ? "" : "s"}
                </div>
              </div>
              <div className="text-right">
                {accent === "profit" ? (
                  <>
                    <div className="font-display text-sm font-bold">
                      {formatMoney(g.profit)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {formatPct(g.marginPct)}
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className={cn(
                        "font-display text-sm font-bold",
                        g.marginPct < 0 ? "text-destructive" : "text-warning",
                      )}
                    >
                      {formatPct(g.marginPct)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {formatMoney(g.profit)}
                    </div>
                  </>
                )}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}