import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { Plus, CalendarIcon } from "lucide-react";
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
import { useSales } from "@/lib/sales-store";
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
  const sales = useSales();
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
    () => sales.filter((s) => !isExpired(s)).slice(0, 5),
    [sales],
  );

  return (
    <AppLayout>
      <h1 className="sr-only">Dashboard</h1>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">Profit</div>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
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
        <div className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
          {formatMoney(totalProfit)}
        </div>
        {period === "custom" && (
          <div className="mt-3 flex flex-wrap gap-2">
            <DateBtn date={customFrom} onChange={setCustomFrom} label="From" />
            <DateBtn date={customTo} onChange={setCustomTo} label="To" />
          </div>
        )}
        <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
          <Stat label="Sales" value={String(inRange.length)} />
          <Stat label="Revenue" value={formatMoney(totalRevenue)} />
          <Stat label="Cost" value={formatMoney(totalCost)} />
        </div>
      </Card>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Recent active</h2>
        <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="size-4" /> Add sale
        </Button>
      </div>
      <div className="mt-3">
        <SalesList
          sales={activeSales}
          emptyText="No active sales. Add your first one."
          onRowClick={(s) => { setEditing(s); setDialogOpen(true); }}
        />
        {activeSales.length > 0 && (
          <div className="mt-3 text-center">
            <Link
              to="/sales"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              View all active →
            </Link>
          </div>
        )}
      </div>

      <SaleDialog open={dialogOpen} onOpenChange={setDialogOpen} sale={editing} />
    </AppLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-semibold">{value}</div>
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
