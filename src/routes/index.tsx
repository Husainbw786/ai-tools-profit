import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import {
  Plus,
  CalendarIcon,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  Wallet,
  Target,
  Pencil,
  Check,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { SaleDialog } from "@/components/SaleDialog";
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
  const [unpaidOnly, setUnpaidOnly] = useState(false);

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

  const inRange = useMemo(() => {
    const base = filterByRange(sales, range);
    return unpaidOnly ? base.filter((s) => s.paymentStatus !== "paid") : base;
  }, [sales, range, unpaidOnly]);
  const totalProfit = inRange.reduce((sum, s) => sum + profit(s), 0);
  const totalRevenue = inRange.reduce((sum, s) => sum + s.sellPrice, 0);
  const totalCost = inRange.reduce((sum, s) => sum + s.buyPrice, 0);
  const unpaidCount = sales.filter((s) => s.paymentStatus !== "paid").length;
  const unpaidAmount = sales
    .filter((s) => s.paymentStatus !== "paid")
    .reduce((a, s) => a + s.sellPrice, 0);

  const { goal, setGoal } = useMonthlyGoal();
  const now = new Date();
  const thisMonthProfit = useMemo(() => {
    const monthRange = { from: startOfMonth(now), to: endOfMonth(now) };
    return filterByRange(sales, monthRange).reduce((a, s) => a + profit(s), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales]);

  const activeSales = useMemo(
    () => {
      const base = sales.filter((s: Sale) => !isExpired(s));
      const filtered = unpaidOnly ? base.filter((s) => s.paymentStatus !== "paid") : base;
      return filtered.slice(0, 5);
    },
    [sales, unpaidOnly],
  );

  const periodLabel = {
    lifetime: "Lifetime",
    "this-month": "This month",
    "last-month": "Last month",
    custom: "Custom range",
  }[period];

  return (
    <AppLayout>
      <h1 className="sr-only">Dashboard</h1>

      <Card
        className="relative overflow-hidden border-0 p-0 text-primary-foreground shadow-[var(--shadow-elegant)]"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full opacity-25 blur-3xl"
          style={{ background: "var(--primary-glow)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative p-6 md:p-8">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider backdrop-blur">
              <TrendingUp className="size-3" />
              Net profit · {periodLabel}
            </div>
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="h-8 w-[140px] border-white/20 bg-white/10 text-xs text-primary-foreground backdrop-blur hover:bg-white/15 focus:ring-white/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lifetime">Lifetime</SelectItem>
                <SelectItem value="this-month">This month</SelectItem>
                <SelectItem value="last-month">Last month</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-5 font-display text-[2.75rem] font-bold leading-none tracking-tight md:text-6xl">
            {formatMoney(totalProfit)}
          </div>
          <div className="mt-2 text-xs text-white/70">
            From {inRange.length} sale{inRange.length === 1 ? "" : "s"} this period
          </div>
          {period === "custom" && (
            <div className="mt-4 flex flex-wrap gap-2">
              <DateBtn date={customFrom} onChange={setCustomFrom} label="From" />
              <DateBtn date={customTo} onChange={setCustomTo} label="To" />
            </div>
          )}
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat
          icon={<Receipt className="size-3.5" />}
          label="Sales"
          value={String(inRange.length)}
        />
        <Stat
          icon={<ArrowUpRight className="size-3.5" />}
          label="Revenue"
          value={formatMoney(totalRevenue)}
        />
        <Stat
          icon={<Wallet className="size-3.5" />}
          label="Cost"
          value={formatMoney(totalCost)}
        />
      </div>

      {unpaidCount > 0 && (
        <button
          type="button"
          onClick={() => setUnpaidOnly((v) => !v)}
          className={cn(
            "mt-3 flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
            unpaidOnly
              ? "border-destructive bg-destructive/10 text-destructive"
              : "border-border/70 bg-card hover:border-destructive/40",
          )}
        >
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Outstanding
            </div>
            <div className="font-display text-base font-semibold tracking-tight">
              {unpaidCount} unpaid · {formatMoney(unpaidAmount)}
            </div>
          </div>
          <span className="text-xs font-medium">
            {unpaidOnly ? "Showing all unpaid" : "Tap to filter"}
          </span>
        </button>
      )}

      <div className="mt-4">
        <ProfitTrendChart sales={sales} />
      </div>

      <GoalCard
        goal={goal}
        setGoal={setGoal}
        thisMonthProfit={thisMonthProfit}
      />

      <div className="mt-8 flex items-end justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Recent active
          </h2>
          <p className="text-xs text-muted-foreground">
            Latest subscriptions still under warranty
          </p>
        </div>
        <Button
          size="sm"
          className="rounded-full shadow-[var(--shadow-soft)]"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> Add
        </Button>
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
        {activeSales.length > 0 && (
          <div className="mt-4 text-center">
            <Link
              to="/sales"
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              View all active <ArrowUpRight className="size-3" />
            </Link>
          </div>
        )}
      </div>

      <SaleDialog open={dialogOpen} onOpenChange={setDialogOpen} sale={editing} />
    </AppLayout>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-3 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="mt-1 truncate font-display text-base font-semibold tracking-tight">
        {value}
      </div>
    </div>
  );
}

function DateBtn({

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
    <Card className="mt-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Target className="size-3.5" /> Monthly goal
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
      <div className="mt-1 flex items-baseline justify-between">
        <span className={cn("font-display text-xl font-bold tracking-tight", reached && "text-success")}>
          {formatMoney(thisMonthProfit)}
        </span>
        <span className="text-xs text-muted-foreground">of {formatMoney(goal)}</span>
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
      <div className="mt-1.5 text-[10px] text-muted-foreground">
        {reached ? "Goal reached 🎉" : `${pct.toFixed(0)}% of monthly target`}
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
