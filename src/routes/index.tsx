import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import {
  CalendarIcon,
  ArrowUpRight,
  ArrowUp,
  AlertCircle,
  Target,
  Pencil,
  Check,
  ChevronRight,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { SaleSheet } from "@/components/SaleSheet";
import { SalesList } from "@/components/SalesList";
import { ProfitTrendChart } from "@/components/ProfitTrendChart";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useSales } from "@/hooks/use-sales";
import { useMonthlyGoal } from "@/hooks/use-goal";
import {
  filterByRange,
  formatMoney,
  isExpired,
  profit,
  balanceDue,
  lineTotal,
  lineCost,
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

type Period = "lifetime" | "this-month" | "last-month" | "custom";

function Index() {
  const { data: sales = [] } = useSales();
  const [period, setPeriod] = useState<Period>("lifetime");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);

  const range: DateRange | null = useMemo(() => {
    const now = new Date();
    if (period === "this-month") return { from: startOfMonth(now), to: endOfMonth(now) };
    if (period === "last-month") {
      const lm = subMonths(now, 1);
      return { from: startOfMonth(lm), to: endOfMonth(lm) };
    }
    if (period === "custom" && customFrom && customTo)
      return { from: customFrom, to: customTo };
    return null;
  }, [period, customFrom, customTo]);

  const inRange = useMemo(() => filterByRange(sales, range), [sales, range]);
  const totalProfit = inRange.reduce((sum, s) => sum + profit(s), 0);
  const totalRevenue = inRange.reduce((sum, s) => sum + lineTotal(s), 0);
  const totalCost = inRange.reduce((sum, s) => sum + lineCost(s), 0);
  const unpaidSales = sales.filter((s) => s.paymentStatus !== "paid");
  const partialCount = unpaidSales.filter((s) => s.paymentStatus === "partial").length;
  const unpaidOnlyCount = unpaidSales.filter((s) => s.paymentStatus === "unpaid").length;
  const dueAmount = unpaidSales.reduce((a, s) => a + balanceDue(s), 0);

  const { goal, setGoal } = useMonthlyGoal();
  const now = new Date();
  const thisMonthProfit = useMemo(() => {
    const monthRange = { from: startOfMonth(now), to: endOfMonth(now) };
    return filterByRange(sales, monthRange).reduce((a, s) => a + profit(s), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales]);

  const activeSales = useMemo(
    () => sales.filter((s: Sale) => !isExpired(s)).slice(0, 5),
    [sales],
  );

  const periodLabel = {
    lifetime: "Lifetime",
    "this-month": "This month",
    "last-month": "Last month",
    custom: "Custom range",
  }[period];

  const periodSelect = (
    <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
      <SelectTrigger className="h-9 rounded-full border-border/70 bg-card px-3 text-xs font-semibold shadow-[var(--shadow-soft)]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="lifetime">Lifetime</SelectItem>
        <SelectItem value="this-month">This month</SelectItem>
        <SelectItem value="last-month">Last month</SelectItem>
        <SelectItem value="custom">Custom range</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <AppLayout>
      <div className="mb-4 flex justify-end">{periodSelect}</div>
      <h1 className="sr-only">Dashboard</h1>

      <Card
        className="relative overflow-hidden border-0 p-0 text-primary-foreground shadow-[var(--shadow-elegant)]"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-16 size-72 rounded-full opacity-50 blur-3xl"
          style={{ background: "var(--primary)" }}
        />
        <div className="relative p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--primary-glow)]">
              <ArrowUp className="size-3" strokeWidth={3} />
              Net profit
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/60">
              {periodLabel}
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="font-display text-3xl font-bold leading-none text-[color:var(--primary-glow)]">
              ₹
            </span>
            <span className="font-display text-[2.75rem] font-bold leading-none tracking-tight md:text-5xl">
              {new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
                totalProfit,
              )}
            </span>
          </div>
          <div className="mt-3 text-xs text-white/70">
            From {inRange.length} sale{inRange.length === 1 ? "" : "s"} this period
          </div>
          {period === "custom" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <DateBtn date={customFrom} onChange={setCustomFrom} label="From" />
              <DateBtn date={customTo} onChange={setCustomTo} label="To" />
            </div>
          )}
          <div
            aria-hidden
            className="my-5 border-t border-dashed border-white/15"
          />
          <div className="grid grid-cols-3 gap-3">
            <HeroStat label="Revenue" value={formatMoney(totalRevenue)} />
            <HeroStat label="Cost" value={formatMoney(totalCost)} />
            <HeroStat label="Sales" value={String(inRange.length)} />
          </div>
        </div>
      </Card>

      {dueAmount > 0 && (
        <Link
          to="/collections"
          className="mt-4 flex items-center gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 px-4 py-3 transition hover:bg-destructive/10"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-destructive/15 text-destructive">
            <AlertCircle className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-destructive">
              {formatMoney(dueAmount)}{" "}
              <span className="font-medium text-destructive/80">to collect</span>
            </div>
            <div className="text-[11px] text-destructive/70">
              {unpaidOnlyCount} unpaid · {partialCount} partial
            </div>
          </div>
          <ChevronRight className="size-4 text-destructive/70" />
        </Link>
      )}

      <div className="mt-4">
        <ProfitTrendChart sales={sales} />
      </div>

      <GoalCard
        goal={goal}
        setGoal={setGoal}
        thisMonthProfit={thisMonthProfit}
      />

      <div className="mt-7 flex items-end justify-between">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">
            Recent active
          </h2>
          <p className="text-xs text-muted-foreground">Still under warranty</p>
        </div>
        <Link
          to="/sales"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          See all <ArrowUpRight className="size-3" />
        </Link>
      </div>
      <div className="mt-4">
        <SalesList
          sales={activeSales}
          emptyText="No active sales. Add your first one."
          onRowClick={(s) => {
            setEditing(s);
            setDialogOpen(true);
          }}
        />
      </div>

      <SaleSheet open={dialogOpen} onOpenChange={setDialogOpen} sale={editing} />
    </AppLayout>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">
        {label}
      </div>
      <div className="mt-1 truncate font-display text-base font-bold tracking-tight">
        {value}
      </div>
    </div>
  );
}

function GoalCard({
  goal,
  setGoal,
  thisMonthProfit,
}: {
  goal: number;
  setGoal: (n: number) => void;
  thisMonthProfit: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>("");
  const pct = goal > 0 ? Math.min(100, (thisMonthProfit / goal) * 100) : 0;
  const reached = goal > 0 && thisMonthProfit >= goal;

  if (!goal && !editing) {
    return (
      <Card className="mt-4 flex items-center justify-between gap-3 border-dashed p-4">
        <div className="flex items-center gap-2">
          <Target className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Set a monthly profit goal
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={() => { setDraft(""); setEditing(true); }}>
          Set goal
        </Button>
      </Card>
    );
  }

  if (editing) {
    return (
      <Card className="mt-4 p-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Target className="size-3.5" /> Monthly profit goal
        </div>
        <div className="flex gap-2">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="e.g. 50000"
            value={draft}
            autoFocus
            onFocus={(e) => e.target.select()}
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
          />
          <Button
            size="sm"
            onClick={() => {
              setGoal(Number(draft) || 0);
              setEditing(false);
            }}
          >
            <Check className="size-4" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mt-4 border-border/70 p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <span className="grid size-6 place-items-center rounded-full bg-primary/15 text-primary">
            <Target className="size-3.5" />
          </span>
          Monthly goal
        </div>
        <button
          type="button"
          onClick={() => { setDraft(String(goal)); setEditing(true); }}
          className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Edit goal"
        >
          <Pencil className="size-3.5" />
        </button>
      </div>
      <div className="mt-2 text-xs font-semibold text-muted-foreground">
        <span className="font-display text-base text-foreground">
          {formatMoney(thisMonthProfit)}
        </span>{" "}
        / {formatMoney(goal)}
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            reached ? "bg-success" : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">
        {reached
          ? "Goal reached 🎉"
          : `${pct.toFixed(0)}% there — ${formatMoney(Math.max(0, goal - thisMonthProfit))} to go in ${format(new Date(), "MMMM")}`}
      </div>
    </Card>
  );
}

function DateBtn({
  date,
  onChange,
  label,
}: {
  date: Date | undefined;
  onChange: (d: Date | undefined) => void;
  label: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("font-normal")}>
          <CalendarIcon className="mr-2 size-3.5" />
          {date ? format(date, "PP") : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onChange}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
