import { balanceDue, lineCost, lineTotal, profit, type Sale } from "@/lib/sale-utils";

export type ContactKind = "customer" | "dealer";

export type ContactSummary = {
  kind: ContactKind;
  name: string; // display
  nameKey: string;
  phone: string | null;
  orders: number;
  revenue: number;
  cost: number;
  totalProfit: number;
  duesAmount: number;
  unpaidCount: number;
  lastPurchase: string | null; // ISO
};

const nameOf = (s: Sale, kind: ContactKind) =>
  (kind === "customer" ? s.customerName : s.buyerName) || "";

const phoneOf = (s: Sale, kind: ContactKind) =>
  kind === "customer" ? s.customerNumber : s.dealerNumber;

export function buildContactSummaries(
  sales: Sale[],
  kind: ContactKind,
): ContactSummary[] {
  const map = new Map<string, ContactSummary>();
  for (const s of sales) {
    const display = nameOf(s, kind).trim();
    if (!display) continue;
    const key = display.toLowerCase();
    let row = map.get(key);
    if (!row) {
      row = {
        kind,
        name: display,
        nameKey: key,
        phone: null,
        orders: 0,
        revenue: 0,
        cost: 0,
        totalProfit: 0,
        duesAmount: 0,
        unpaidCount: 0,
        lastPurchase: null,
      };
      map.set(key, row);
    }
    row.orders += 1;
    row.revenue += lineTotal(s);
    row.cost += lineCost(s);
    row.totalProfit += profit(s);
    const due = balanceDue(s);
    if (due > 0) {
      row.duesAmount += due;
      row.unpaidCount += 1;
    }
    if (!row.phone) {
      const p = phoneOf(s, kind);
      if (p) row.phone = p;
    }
    if (!row.lastPurchase || s.warrantyStart > row.lastPurchase) {
      row.lastPurchase = s.warrantyStart;
    }
  }
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

export const TAG_PRESETS = [
  "VIP",
  "Friend",
  "Wholesale",
  "Slow-payer",
  "Blocked",
] as const;

export function tagColor(tag: string): string {
  const t = tag.toLowerCase();
  if (t.includes("vip")) return "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300";
  if (t.includes("friend")) return "bg-sky-500/15 text-sky-700 border-sky-500/30 dark:text-sky-300";
  if (t.includes("slow")) return "bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-300";
  if (t.includes("block")) return "bg-destructive/15 text-destructive border-destructive/30";
  if (t.includes("whole")) return "bg-violet-500/15 text-violet-700 border-violet-500/30 dark:text-violet-300";
  return "bg-secondary text-secondary-foreground border-border";
}

export function waLink(phone: string | null | undefined, text?: string) {
  const p = (phone ?? "").replace(/[^0-9]/g, "");
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return p ? `https://wa.me/${p}${q}` : null;
}

export function telLink(phone: string | null | undefined) {
  const p = (phone ?? "").replace(/[^0-9+]/g, "");
  return p ? `tel:${p}` : null;
}