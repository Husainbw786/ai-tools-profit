import { format, startOfMonth } from "date-fns";
import { balanceDue, effectiveRevenue, profit, type Sale } from "@/lib/sale-utils";

export type Group = {
  key: string;
  count: number;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPct: number;
};

const buildGroups = (
  sales: Sale[],
  keyOf: (s: Sale) => string,
): Group[] => {
  const map = new Map<string, Group>();
  for (const s of sales) {
    const key = keyOf(s).trim();
    if (!key) continue;
    const existing =
      map.get(key) ??
      ({ key, count: 0, units: 0, revenue: 0, cost: 0, profit: 0, marginPct: 0 } as Group);
    existing.count += 1;
    existing.units += s.quantity || 1;
    existing.revenue += effectiveRevenue(s);
    existing.cost += s.buyPrice * (s.quantity || 1);
    existing.profit += profit(s);
    map.set(key, existing);
  }
  return Array.from(map.values()).map((g) => ({
    ...g,
    marginPct: g.cost > 0 ? (g.profit / g.cost) * 100 : 0,
  }));
};

export const groupByProduct = (sales: Sale[]) =>
  buildGroups(sales, (s) => s.productName);
export const groupByCustomer = (sales: Sale[]) =>
  buildGroups(sales, (s) => s.customerName);
export const groupByBuyer = (sales: Sale[]) =>
  buildGroups(sales, (s) => s.buyerName);

export type MonthRow = {
  monthKey: string; // YYYY-MM
  monthLabel: string;
  count: number;
  revenue: number;
  cost: number;
  profit: number;
  unpaidAmount: number;
  unpaidCount: number;
};

export const monthlyPnL = (sales: Sale[]): MonthRow[] => {
  const map = new Map<string, MonthRow>();
  for (const s of sales) {
    const d = startOfMonth(new Date(s.warrantyStart));
    const key = format(d, "yyyy-MM");
    const label = format(d, "MMM yyyy");
    const row =
      map.get(key) ??
      ({
        monthKey: key,
        monthLabel: label,
        count: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        unpaidAmount: 0,
        unpaidCount: 0,
      } as MonthRow);
    row.count += 1;
    row.revenue += effectiveRevenue(s);
    row.cost += s.buyPrice * (s.quantity || 1);
    row.profit += profit(s);
    const due = balanceDue(s);
    if (due > 0) {
      row.unpaidCount += 1;
      row.unpaidAmount += due;
    }
    map.set(key, row);
  }
  return Array.from(map.values()).sort((a, b) =>
    b.monthKey.localeCompare(a.monthKey),
  );
};