import { useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
    <Card className="border-border/70 bg-card p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Profit trend
          </div>
          <div className="font-display text-sm font-semibold tracking-tight">
            Last 6 months
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground">
          Peak {formatMoney(max)}
        </div>
      </div>
      <div className="mt-2 h-36 w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={40}
                tickFormatter={(v) =>
                  v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                }
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [formatMoney(v), "Profit"]}
              />
              <Bar dataKey="profit" fill="var(--accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
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