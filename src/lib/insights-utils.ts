import { format, startOfMonth } from "date-fns";
import {
  balanceDue,
  effectiveRevenue,
  lineCost,
  marginPctOf,
  profit,
  type Sale,
} from "@/lib/sale-utils";

/**
 * Money totals over a set of sales. Every page that shows "Revenue / Cost /
 * Profit / Due" derives them from here so the numbers always agree:
 *   revenue - cost === profit, and margin = profit / cost.
 */
export type SalesSummary = {
  count: number;
  units: number;
  revenue: number; // net of refunds
  cost: number;
  profit: number;
  marginPct: number;
  dueAmount: number;
  unpaidCount: number; // sales with any balance outstanding
};

const emptySummary = (): SalesSummary => ({
  count: 0,
  units: 0,
  revenue: 0,
  cost: 0,
  profit: 0,
  marginPct: 0,
  dueAmount: 0,
  unpaidCount: 0,
});

const addSale = (acc: SalesSummary, s: Sale) => {
  acc.count += 1;
  acc.units += s.quantity || 1;
  acc.revenue += effectiveRevenue(s);
  acc.cost += lineCost(s);
  acc.profit += profit(s);
  const due = balanceDue(s);
  if (due > 0) {
    acc.dueAmount += due;
    acc.unpaidCount += 1;
  }
  return acc;
};

const finalize = <T extends SalesSummary>(acc: T): T => {
  acc.marginPct = marginPctOf(acc.profit, acc.cost);
  return acc;
};

export const summarizeSales = (sales: Sale[]): SalesSummary =>
  finalize(sales.reduce(addSale, emptySummary()));

export type Group = SalesSummary & { key: string };

const buildGroups = (sales: Sale[], keyOf: (s: Sale) => string): Group[] => {
  const map = new Map<string, Group>();
  for (const s of sales) {
    const key = keyOf(s).trim();
    if (!key) continue;
    const existing = map.get(key) ?? { key, ...emptySummary() };
    map.set(key, addSale(existing, s) as Group);
  }
  return Array.from(map.values()).map(finalize);
};

export const groupByProduct = (sales: Sale[]) => buildGroups(sales, (s) => s.productName);
export const groupByCustomer = (sales: Sale[]) => buildGroups(sales, (s) => s.customerName);
export const groupByBuyer = (sales: Sale[]) => buildGroups(sales, (s) => s.buyerName);

export type MonthRow = SalesSummary & {
  monthKey: string; // YYYY-MM
  monthLabel: string;
};

export const monthlyPnL = (sales: Sale[]): MonthRow[] => {
  const map = new Map<string, MonthRow>();
  for (const s of sales) {
    const d = startOfMonth(new Date(s.warrantyStart));
    const key = format(d, "yyyy-MM");
    const row = map.get(key) ?? {
      monthKey: key,
      monthLabel: format(d, "MMM yyyy"),
      ...emptySummary(),
    };
    map.set(key, addSale(row, s) as MonthRow);
  }
  return Array.from(map.values())
    .map(finalize)
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
};
