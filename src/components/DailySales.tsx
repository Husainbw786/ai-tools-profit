import { lazy, Suspense, useMemo, useState } from "react";
import { addDays, endOfDay, format, isSameDay, isToday, isYesterday, startOfDay } from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bone } from "@/components/skeletons";
import { SalesList } from "@/components/SalesList";
import { cn } from "@/lib/utils";
import { effectiveRevenue, filterByRange, formatMoney, profit, type Sale } from "@/lib/sale-utils";

const Calendar = lazy(() =>
  import("@/components/ui/calendar").then((m) => ({ default: m.Calendar })),
);

/** "Today" / "Yesterday" / "Mon, 12 Oct" for the picked day. */
function dayLabel(d: Date) {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEE, d MMM yyyy");
}

/** Sales made on one chosen day: ‹ date › stepper, totals and the day's sales. */
export function DailySales({
  sales,
  onRowClick,
  className,
}: {
  sales: Sale[];
  onRowClick?: (s: Sale) => void;
  className?: string;
}) {
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [pickerOpen, setPickerOpen] = useState(false);
  const atToday = isSameDay(day, new Date());

  const daySales = useMemo(
    () =>
      filterByRange(sales, { from: startOfDay(day), to: endOfDay(day) }).sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
      ),
    [sales, day],
  );
  const revenue = daySales.reduce((a, s) => a + effectiveRevenue(s), 0);
  const dayProfit = daySales.reduce((a, s) => a + profit(s), 0);
  const units = daySales.reduce((a, s) => a + (s.quantity || 1), 0);

  const stepBtn =
    "grid size-8 place-items-center rounded-full bg-secondary text-muted-foreground transition hover:text-foreground disabled:opacity-40 disabled:hover:text-muted-foreground";

  return (
    <section aria-label="Sales on a day" className={className}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-section">Sales on a day</h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Previous day"
            onClick={() => setDay((d) => addDays(d, -1))}
            className={stepBtn}
          >
            <ChevronLeft className="size-4" strokeWidth={2.4} />
          </button>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-secondary px-3 text-[12px] font-bold text-foreground"
              >
                <CalendarIcon className="size-3.5 text-muted-foreground" />
                {dayLabel(day)}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Suspense fallback={<Bone className="m-3 h-[300px] w-[260px]" />}>
                <Calendar
                  mode="single"
                  selected={day}
                  defaultMonth={day}
                  disabled={{ after: new Date() }}
                  onSelect={(d) => {
                    if (!d) return;
                    setDay(startOfDay(d));
                    setPickerOpen(false);
                  }}
                  initialFocus
                  className="pointer-events-auto p-3"
                />
              </Suspense>
            </PopoverContent>
          </Popover>
          <button
            type="button"
            aria-label="Next day"
            disabled={atToday}
            onClick={() => setDay((d) => addDays(d, 1))}
            className={stepBtn}
          >
            <ChevronRight className="size-4" strokeWidth={2.4} />
          </button>
        </div>
      </div>

      <div className="mt-3.5 grid grid-cols-3 gap-2.5">
        <Stat label="Sale" value={formatMoney(revenue)} />
        <Stat
          label="Profit"
          value={formatMoney(dayProfit)}
          className={dayProfit < 0 ? "text-destructive" : "text-success"}
        />
        <Stat
          label={units !== daySales.length ? `Sales · ${units} units` : "Sales"}
          value={daySales.length}
        />
      </div>

      <div className="mt-1">
        <SalesList
          sales={daySales}
          onRowClick={onRowClick}
          emptyText={`No sales ${atToday ? "today" : `on ${format(day, "d MMM yyyy")}`}.`}
        />
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="rounded-[16px] border border-border bg-card px-3.5 py-3">
      <div className="text-[11px] font-semibold text-muted-foreground">{label}</div>
      <div className={cn("tabular mt-1 truncate text-[16px] font-bold", className)}>{value}</div>
    </div>
  );
}
