import { useMemo } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { format, startOfMonth, subMonths } from "date-fns";
import { Card } from "@/components/ui/card";
import { formatMoney, profit, type Sale } from "@/lib/sale-utils";

type Props = { sales: Sale[] };

export function ProfitTrendChart({ sales }: Props) {
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

  const max = Math.max(1, ...data.map((d) => d.profit));
  const hasData = data.some((d) => d.profit !== 0);

  return (
    <Card className="border-border/70 bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Profit trend
          </div>
          <div className="mt-0.5 font-display text-base font-bold tracking-tight">
            Last 6 months
          </div>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
          Peak {formatMoney(max)}
        </div>
      </div>
      <div className="mt-2 h-40 w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 14, right: 8, left: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                interval={0}
                tickMargin={6}
              />
              <Tooltip
                cursor={{ stroke: "var(--primary)", strokeOpacity: 0.3 }}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  fontSize: 12,
                }}
                formatter={(v: number) => [formatMoney(v), "Profit"]}
              />
              <Area
                type="monotone"
                dataKey="profit"
                stroke="var(--primary)"
                strokeWidth={2.5}
                fill="url(#profitFill)"
                dot={false}
                activeDot={{
                  r: 5,
                  fill: "var(--primary)",
                  stroke: "var(--card)",
                  strokeWidth: 3,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No data in the last 6 months
          </div>
        )}
      </div>
    </Card>
  );
}