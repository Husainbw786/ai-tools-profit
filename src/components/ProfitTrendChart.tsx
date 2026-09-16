import { useMemo, useState } from "react";
import { format, startOfMonth, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { formatCompactMoney, formatMoney, profit, type Sale } from "@/lib/sale-utils";

type Props = { sales: Sale[]; className?: string };

/**
 * Six-month profit trend as tap-to-select bars. Default bar = chip colour,
 * peak month = ink, selected month (defaults to the current one) = terracotta.
 */
export function ProfitTrendChart({ sales, className }: Props) {
  const data = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; profit: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = startOfMonth(subMonths(now, i));
      buckets.push({ key: format(d, "yyyy-MM"), label: format(d, "MMM"), profit: 0 });
    }
    for (const s of sales) {
      const key = format(startOfMonth(new Date(s.warrantyStart)), "yyyy-MM");
      const b = buckets.find((x) => x.key === key);
      if (b) b.profit += profit(s);
    }
    return buckets;
  }, [sales]);

  const [selected, setSelected] = useState(5);
  const max = Math.max(1, ...data.map((d) => d.profit));
  const peakValue = Math.max(...data.map((d) => d.profit));
  const peakIndex = peakValue > 0 ? data.findIndex((d) => d.profit === peakValue) : -1;

  return (
    <div className={cn("pt-[22px]", className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-semibold text-muted-foreground">Last 6 months</span>
        <span className="text-[12px] font-semibold text-faint">
          {peakIndex >= 0
            ? `Peak ${formatMoney(peakValue)} · ${data[peakIndex].label}`
            : "No profit yet"}
        </span>
      </div>
      <div
        role="group"
        aria-label="Monthly profit, last six months"
        className="mt-4 grid h-[132px] grid-cols-6 items-end gap-2.5"
      >
        {data.map((d, i) => {
          const isSelected = selected === i;
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
                  "mt-2 text-[11px] font-bold",
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
