import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { AppLayout } from "@/components/AppLayout";
import { PeriodPopover } from "@/components/PeriodPopover";
import { EmptyState, PageTitle, QuadStat, SectionTitle, TextTabs } from "@/components/primitives";
import { SkeletonRows, SkeletonStats } from "@/components/skeletons";
import { cn } from "@/lib/utils";
import { useSales } from "@/hooks/use-sales";
import { filterByRange, formatMoney, formatPct, type DateRange } from "@/lib/sale-utils";
import {
  groupByBuyer,
  groupByCustomer,
  groupByProduct,
  monthlyPnL,
  type Group,
} from "@/lib/insights-utils";
import { downloadFile, monthlyPnLToCSV, monthlyPnLToPDF } from "@/lib/exports";

type Period = "lifetime" | "this-month" | "last-3" | "last-12";
type Breakdown = "product" | "customer" | "buyer";

const PERIODS: { id: Period; label: string }[] = [
  { id: "lifetime", label: "Lifetime" },
  { id: "this-month", label: "This month" },
  { id: "last-3", label: "Last 3 months" },
  { id: "last-12", label: "Last 12 months" },
];

const BREAKDOWNS: { id: Breakdown; label: string }[] = [
  { id: "product", label: "Product" },
  { id: "customer", label: "Customer" },
  { id: "buyer", label: "Dealer" },
];

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
  const { data: sales = [], isPending } = useSales();
  const [period, setPeriod] = useState<Period>("lifetime");
  const [tab, setTab] = useState<Breakdown>("product");

  const range: DateRange | null = useMemo(() => {
    const now = new Date();
    if (period === "this-month") return { from: startOfMonth(now), to: endOfMonth(now) };
    if (period === "last-3") return { from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now) };
    if (period === "last-12")
      return { from: startOfMonth(subMonths(now, 11)), to: endOfMonth(now) };
    return null;
  }, [period]);

  const inRange = useMemo(() => filterByRange(sales, range), [sales, range]);
  const groups = useMemo(
    () =>
      tab === "product"
        ? groupByProduct(inRange)
        : tab === "customer"
          ? groupByCustomer(inRange)
          : groupByBuyer(inRange),
    [inRange, tab],
  );
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

  const exportCSV = () =>
    downloadFile(`pnl-${period}.csv`, monthlyPnLToCSV(pnl), "text/csv;charset=utf-8");
  const exportPDF = () => monthlyPnLToPDF(pnl, `pnl-${period}.pdf`);

  const topEarners = [...groups].sort((a, b) => b.profit - a.profit).slice(0, 5);
  const lowestMargins = [...groups]
    .filter((g) => g.cost > 0)
    .sort((a, b) => a.marginPct - b.marginPct)
    .slice(0, 3);

  if (isPending) {
    return (
      <AppLayout>
        <PageTitle className="mt-7" title="Insights" sub="Profit breakdown & reports" />
        <SkeletonStats cols={4} className="mt-[26px]" />
        <SkeletonRows className="mt-8" count={4} />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageTitle
        className="mt-7"
        title="Insights"
        sub="Profit breakdown & reports"
        right={<PeriodPopover options={PERIODS} value={period} onChange={setPeriod} />}
      />

      <div className="tabular mt-[26px] grid grid-cols-2 border-y border-border md:grid-cols-4">
        <QuadStat index={0} label="Revenue" value={formatMoney(totals.revenue)} />
        <QuadStat index={1} label="Cost" value={formatMoney(totals.cost)} />
        <QuadStat
          index={2}
          label="Profit"
          value={formatMoney(totals.profit)}
          valueClassName="text-accent-text"
        />
        <QuadStat
          index={3}
          label="Unpaid"
          value={formatMoney(totals.unpaidAmount)}
          valueClassName="text-destructive"
        />
      </div>

      <SectionTitle
        className="mt-[30px]"
        right={
          <span className="flex gap-1.5">
            <ExportPill onClick={exportCSV} disabled={!pnl.length}>
              CSV
            </ExportPill>
            <ExportPill onClick={exportPDF} disabled={!pnl.length}>
              PDF
            </ExportPill>
          </span>
        }
      >
        Monthly P&amp;L
      </SectionTitle>
      <div className="mt-2">
        {pnl.length === 0 ? (
          <EmptyState>No sales in this period.</EmptyState>
        ) : (
          pnl.map((r) => (
            <div key={r.monthKey} className="tabular border-b border-hairline py-3.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[14px] font-bold">{r.monthLabel}</span>
                <span className="rounded-full bg-secondary px-2 py-[3px] text-[11px] font-bold text-muted-foreground">
                  {r.count} sale{r.count === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-4 text-[12px]">
                <PnlCell label="REV" value={formatMoney(r.revenue)} />
                <PnlCell label="COST" value={formatMoney(r.cost)} />
                <PnlCell
                  label="PROFIT"
                  value={formatMoney(r.profit)}
                  className="font-bold text-accent-text"
                />
                <PnlCell
                  label="UNPAID"
                  value={r.unpaidAmount > 0 ? formatMoney(r.unpaidAmount) : "—"}
                  className={r.unpaidAmount > 0 ? "text-destructive" : "text-faint"}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <h2 className="text-section mt-[30px]">Profit breakdown</h2>
      <TextTabs className="mt-3" tabs={BREAKDOWNS} value={tab} onChange={setTab} />

      {groups.length === 0 ? (
        <EmptyState>Nothing to show.</EmptyState>
      ) : (
        <div className="md:grid md:grid-cols-2 md:gap-x-10">
          <div>
            <div className="text-kicker mt-[22px] text-muted-foreground">TOP EARNERS</div>
            {topEarners.map((g, i) => (
              <GroupRow key={g.key} group={g} rank={i + 1} accent="profit" />
            ))}
          </div>
          <div>
            <div className="text-kicker mt-[26px] text-muted-foreground md:mt-[22px]">
              LOWEST MARGINS
            </div>
            {lowestMargins.length === 0 ? (
              <div className="py-3.5 text-[13px] text-faint">No data</div>
            ) : (
              lowestMargins.map((g) => <GroupRow key={g.key} group={g} accent="margin" />)
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function ExportPill({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-border px-3 py-1.5 text-[11px] font-bold transition hover:bg-secondary/60 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function PnlCell({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold tracking-[0.04em] text-faint">{label}</div>
      <div className={cn("mt-0.5 truncate font-semibold", className)}>{value}</div>
    </div>
  );
}

function GroupRow({
  group: g,
  rank,
  accent,
}: {
  group: Group;
  rank?: number;
  accent: "profit" | "margin";
}) {
  return (
    <div className="tabular flex items-center justify-between gap-3 border-b border-hairline py-[13px]">
      <div className="flex min-w-0 items-center gap-3">
        {rank !== undefined && (
          <span className="w-[22px] shrink-0 text-[12px] font-bold text-faint">
            {String(rank).padStart(2, "0")}
          </span>
        )}
        <div className="min-w-0">
          <div className="truncate text-[14px] font-bold">{g.key}</div>
          <div className="mt-px text-[11px] text-muted-foreground">
            {g.count} sale{g.count === 1 ? "" : "s"} · {g.units} unit{g.units === 1 ? "" : "s"}
          </div>
        </div>
      </div>
      <div className="shrink-0 text-right">
        {accent === "profit" ? (
          <>
            <div className="text-[14px] font-bold">{formatMoney(g.profit)}</div>
            <div className="text-[11px] font-semibold text-accent-text">
              {formatPct(g.marginPct)}
            </div>
          </>
        ) : (
          <>
            <div className="text-[14px] font-bold text-warning">{formatPct(g.marginPct)}</div>
            <div className="text-[11px] font-semibold text-muted-foreground">
              {formatMoney(g.profit)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
