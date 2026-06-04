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
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { SaleDialog } from "@/components/SaleDialog";
import { SalesList } from "@/components/SalesList";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
      { title: "Dashboard — SubTracker" },
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
  const totalRevenue = inRange.reduce((sum, s) => sum + s.sellPrice, 0);
  const totalCost = inRange.reduce((sum, s) => sum + s.buyPrice, 0);

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
