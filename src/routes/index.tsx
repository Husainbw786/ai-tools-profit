import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { differenceInCalendarDays, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { ArrowRight, ArrowUp } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { SaleSheet } from "@/components/SaleSheet";
import { SalesList } from "@/components/SalesList";
import { ProfitTrendChart } from "@/components/ProfitTrendChart";
import { PeriodPopover } from "@/components/PeriodPopover";
import { Stat, StatGrid } from "@/components/primitives";
import { SkeletonChart, SkeletonHero, SkeletonRows, SkeletonStats } from "@/components/skeletons";
import { useAuth } from "@/hooks/use-auth";
import { useSales } from "@/hooks/use-sales";
import { useMonthlyGoal } from "@/hooks/use-goal";
import { cn } from "@/lib/utils";
import {
  balanceDue,
  effectiveRevenue,
  filterByRange,
  formatMoney,
  isExpired,
  isRefunded,
  lineCost,
  profit,
  type DateRange,
  type Sale,
} from "@/lib/sale-utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — ProfitAI" },
      { name: "description", content: "Track subscription resales and profit." },
    ],
  }),
  component: Index,
});

type Period = "lifetime" | "this-month" | "last-month";

const PERIODS: { id: Period; label: string }[] = [
  { id: "lifetime", label: "Lifetime" },
  { id: "this-month", label: "This month" },
  { id: "last-month", label: "Last month" },
];

function Index() {
  const { data: sales = [], isPending } = useSales();
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("lifetime");
  const [editing, setEditing] = useState<Sale | null>(null);

  const now = new Date();
  const range: DateRange | null = useMemo(() => {
    if (period === "this-month") return { from: startOfMonth(now), to: endOfMonth(now) };
    if (period === "last-month") {
      const lm = subMonths(now, 1);
      return { from: startOfMonth(lm), to: endOfMonth(lm) };
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const inRange = useMemo(() => filterByRange(sales, range), [sales, range]);
  const totalProfit = inRange.reduce((sum, s) => sum + profit(s), 0);
  const totalRevenue = inRange.reduce((sum, s) => sum + effectiveRevenue(s), 0);
  const totalCost = inRange.reduce((sum, s) => sum + lineCost(s), 0);
  const totalUnits = inRange.reduce((sum, s) => sum + (s.quantity || 1), 0);

  const unpaid = useMemo(() => sales.filter((s) => balanceDue(s) > 0 && !isRefunded(s)), [sales]);
  const dueAmount = unpaid.reduce((a, s) => a + balanceDue(s), 0);
  const unpaidOnlyCount = unpaid.filter((s) => s.paymentStatus === "unpaid").length;
  const partialCount = unpaid.filter((s) => s.paymentStatus === "partial").length;
  const oldestDays = unpaid.length
    ? Math.max(...unpaid.map((s) => differenceInCalendarDays(now, new Date(s.warrantyStart))))
    : 0;

  const { goal, setGoal } = useMonthlyGoal();
  const thisMonthProfit = useMemo(
    () =>
      filterByRange(sales, { from: startOfMonth(now), to: endOfMonth(now) }).reduce(
        (a, s) => a + profit(s),
        0,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sales],
  );
  const goalPct = goal > 0 ? Math.min(100, (thisMonthProfit / goal) * 100) : 0;

  const active = useMemo(() => sales.filter((s) => !isExpired(s)), [sales]);
  const recent = useMemo(
    () => [...active].sort((a, b) => b.warrantyStart.localeCompare(a.warrantyStart)).slice(0, 4),
    [active],
  );

  const initial = (user?.email?.[0] ?? "P").toUpperCase();

  if (isPending) {
    return (
      <AppLayout>
        <h1 className="sr-only">Dashboard</h1>
        <div className="flex items-center justify-between pt-5 md:pt-2">
          <Link
            to="/more"
            aria-label="More"
            className="grid size-9 place-items-center rounded-full bg-primary text-[14px] font-extrabold text-white md:invisible"
          >
            {initial}
          </Link>
          <PeriodPopover options={PERIODS} value={period} onChange={setPeriod} />
        </div>
        <SkeletonHero className="mt-[34px]" />
        <SkeletonStats className="mt-8" />
        <SkeletonChart />
        <SkeletonRows className="mt-8" count={3} />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <h1 className="sr-only">Dashboard</h1>

      <div className="flex items-center justify-between pt-5 md:pt-2">
        <Link
          to="/more"
          aria-label="More"
          className="grid size-9 place-items-center rounded-full bg-primary text-[14px] font-extrabold text-white md:invisible"
        >
          {initial}
        </Link>
        <PeriodPopover options={PERIODS} value={period} onChange={setPeriod} />
      </div>

      <div className="mt-[34px] text-[13px] font-semibold text-muted-foreground">Net profit</div>
      <div className="text-hero mt-2">{formatMoney(totalProfit)}</div>
      <div className="mt-3 inline-flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-accent-text">
        <ArrowUp className="size-3.5" strokeWidth={2.5} />
        {formatMoney(thisMonthProfit)} this month
        {goal > 0 && (
          <span className="font-medium text-faint">· {goalPct.toFixed(0)}% of goal</span>
        )}
      </div>

      <StatGrid cols={3} className="mt-8">
        <Stat label="Revenue" value={formatMoney(totalRevenue)} />
        <Stat label="Cost" value={formatMoney(totalCost)} />
        <Stat
          label="Sales"
          value={
            totalUnits !== inRange.length ? (
              <>
                {inRange.length}{" "}
                <span className="text-[12px] font-semibold text-faint">· {totalUnits} units</span>
              </>
            ) : (
              inRange.length
            )
          }
        />
      </StatGrid>

      {dueAmount > 0 && (
        <Link
          to="/collections"
          className="flex items-center justify-between gap-3 border-b border-border py-[18px]"
        >
          <div className="min-w-0">
            <div className="tabular text-[15px] font-bold">{formatMoney(dueAmount)} to collect</div>
            <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
              {unpaidOnlyCount} unpaid · {partialCount} partial · oldest {oldestDays} days
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-primary px-3.5 py-2 text-[12px] font-bold text-white">
            Remind
          </span>
        </Link>
      )}

      <ProfitTrendChart sales={sales} />

      <GoalBlock goal={goal} setGoal={setGoal} earned={thisMonthProfit} pct={goalPct} />

      <div className="mt-[30px] flex items-baseline justify-between">
        <h2 className="text-section">Active</h2>
        <Link
          to="/sales"
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-muted-foreground transition hover:text-foreground"
        >
          {active.length} <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <div className="mt-1">
        <SalesList
          sales={recent}
          emptyText="No active sales. Tap + to add your first one."
          onRowClick={(s) => setEditing(s)}
        />
      </div>

      <SaleSheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)} sale={editing} />
    </AppLayout>
  );
}

function GoalBlock({
  goal,
  setGoal,
  earned,
  pct,
}: {
  goal: number;
  setGoal: (n: number) => void;
  earned: number;
  pct: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const month = format(new Date(), "MMMM");
  const reached = goal > 0 && earned >= goal;

  const save = () => {
    setGoal(Number(draft) || 0);
    setEditing(false);
  };

  return (
    <div className="mt-7 border-y border-border py-[18px]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-semibold text-muted-foreground">{month} goal</span>
        {editing ? (
          <span className="flex gap-1.5">
            <input
              autoFocus
              inputMode="numeric"
              pattern="[0-9]*"
              value={draft}
              placeholder="e.g. 15000"
              onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && save()}
              className="tabular h-8 w-[110px] rounded-[8px] border border-border bg-transparent px-2.5 text-[13px] font-bold text-foreground outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={save}
              className="h-8 rounded-[8px] bg-primary px-3 text-[12px] font-bold text-white"
            >
              Save
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(goal ? String(goal) : "");
              setEditing(true);
            }}
            className="tabular text-[13px] font-bold"
          >
            {goal > 0 ? (
              <>
                {formatMoney(earned)}{" "}
                <span className="font-semibold text-faint">/ {formatMoney(goal)} ✎</span>
              </>
            ) : (
              <span className="font-semibold text-accent-text">Set a goal ✎</span>
            )}
          </button>
        )}
      </div>
      <div className="mt-3.5 h-1 overflow-hidden rounded-full bg-hairline">
        <div
          className={cn("h-full rounded-full bg-primary transition-[width]")}
          style={{ width: `${goal > 0 ? pct : 0}%` }}
        />
      </div>
      <div className="mt-2 text-[12px] text-muted-foreground">
        {goal <= 0
          ? "Set a monthly profit goal to track progress."
          : reached
            ? "Goal reached"
            : `${pct.toFixed(0)}% there — ${formatMoney(Math.max(0, goal - earned))} to go in ${month}`}
      </div>
    </div>
  );
}
