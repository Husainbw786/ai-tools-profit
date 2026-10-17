import { useEffect, useMemo, useState } from "react";
import {
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { cn } from "@/lib/utils";
import { SegmentedPill } from "@/components/primitives";
import { formatCompactMoney, formatMoney, profit, type Sale } from "@/lib/sale-utils";

type Props = { sales: Sale[]; className?: string };

type Period = "day" | "week" | "month";

const PERIODS: { id: Period; label: string }[] = [
  { id: "day", label: "Daily" },
  { id: "week", label: "Weekly" },
  { id: "month", label: "Monthly" },
];

const KEY = "profitai.trendPeriod";

/** How each view buckets sales: bucket count, bucket start, labels. */
const CONFIG: Record<
  Period,
  {
    count: number;
    title: string;
    aria: string;
    start: (d: Date) => Date;
    back: (d: Date, n: number) => Date;
    label: (d: Date, isCurrent: boolean) => string;
    peakLabel: (d: Date) => string;
  }
> = {
  day: {
    count: 7,
    title: "Last 7 days",
    aria: "Daily profit, last seven days",
    start: startOfDay,
    back: subDays,
    label: (d, cur) => (cur ? "Today" : format(d, "EEE")),
    peakLabel: (d) => format(d, "EEE d MMM"),
  },
  week: {
    count: 6,
    title: "Last 6 weeks",
    aria: "Weekly profit, last six weeks",
    start: (d) => startOfWeek(d, { weekStartsOn: 1 }),
    back: subWeeks,
    label: (d, cur) => (cur ? "This wk" : format(d, "d MMM")),
    peakLabel: (d) => `wk of ${format(d, "d MMM")}`,
  },
  month: {
    count: 6,
    title: "Last 6 months",
    aria: "Monthly profit, last six months",
    start: startOfMonth,
    back: subMonths,
    label: (d) => format(d, "MMM"),
    peakLabel: (d) => format(d, "MMM"),
  },
};

/**
 * Profit trend as tap-to-select bars, switchable between daily (last 7 days),
 * weekly and monthly buckets. Default bar = chip colour, peak = ink,
 * selected (defaults to the current period) = terracotta.
 */
export function ProfitTrendChart({ sales, className }: Props) {
  const [period, setPeriodState] = useState<Period>("day");

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(KEY);
      if (v === "day" || v === "week" || v === "month") setPeriodState(v);
    } catch {
      // Storage unavailable; keep the default.
    }
  }, []);

  const cfg = CONFIG[period];

  const data = useMemo(() => {
    const now = new Date();
    const buckets: { key: number; date: Date; label: string; profit: number }[] = [];
    for (let i = cfg.count - 1; i >= 0; i--) {
      const d = cfg.start(cfg.back(now, i));
      buckets.push({ key: d.getTime(), date: d, label: cfg.label(d, i === 0), profit: 0 });
    }
    for (const s of sales) {
      const key = cfg.start(new Date(s.warrantyStart)).getTime();
      const b = buckets.find((x) => x.key === key);
      if (b) b.profit += profit(s);
    }
    return buckets;
  }, [sales, cfg]);

  const [selected, setSelected] = useState(cfg.count - 1);

  const setPeriod = (p: Period) => {
    setPeriodState(p);
    setSelected(CONFIG[p].count - 1);
    try {
      window.localStorage.setItem(KEY, p);
    } catch {
      // Ignore; the choice just won't be remembered.
    }
  };

  const sel = data[Math.min(selected, data.length - 1)];
  const total = data.reduce((sum, d) => sum + d.profit, 0);
  const max = Math.max(1, ...data.map((d) => d.profit));
  const peakValue = Math.max(...data.map((d) => d.profit));
  const peakIndex = peakValue > 0 ? data.findIndex((d) => d.profit === peakValue) : -1;

  return (
    <div className={cn("pt-[22px]", className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-semibold text-muted-foreground">{cfg.title}</span>
        <SegmentedPill options={PERIODS} value={period} onChange={setPeriod} />
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <span className="tabular text-[12px] font-semibold text-faint">
          Total {formatMoney(total)}
          {period === "day" && ` · avg ${formatMoney(total / cfg.count)}/day`}
        </span>
        <span className="text-[12px] font-semibold text-faint">
          {peakIndex >= 0
            ? `Peak ${formatMoney(peakValue)} · ${cfg.peakLabel(data[peakIndex].date)}`
            : "No profit yet"}
        </span>
      </div>
      <div
        role="group"
        aria-label={cfg.aria}
        className="mt-4 grid h-[132px] items-end gap-2.5"
        style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
      >
        {data.map((d, i) => {
          const isSelected = sel === d;
          const isPeak = i === peakIndex;
          const pct = Math.max(4, (Math.max(0, d.profit) / max) * 100);
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => setSelected(i)}
              aria-pressed={isSelected}
              aria-label={`${d.label}: ${formatMoney(d.profit)}`}
              className="flex h-full flex-col items-center justify-end"
            >
              <span
                className={cn(
                  "tabular mb-1.5 text-[11px] font-bold transition-opacity duration-150",
                  isSelected ? "text-foreground" : "text-faint",
                  isSelected || isPeak ? "opacity-100" : "opacity-0",
                )}
              >
                {formatCompactMoney(d.profit)}
              </span>
              <span
                className={cn(
                  "w-full max-w-[34px] rounded-[8px_8px_4px_4px] transition-colors duration-150",
                  isSelected ? "bg-primary" : isPeak ? "bg-foreground" : "bg-secondary",
                )}
                style={{ height: `calc((100% - 44px) * ${pct / 100})`, minHeight: 4 }}
              />
              <span
                className={cn(
                  "mt-2 whitespace-nowrap text-[11px] font-bold",
                  isSelected ? "text-foreground" : "text-faint",
                )}
              >
                {d.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
