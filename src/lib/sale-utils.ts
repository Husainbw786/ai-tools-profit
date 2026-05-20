import { addMonths, differenceInCalendarDays } from "date-fns";

export type Sale = {
  id: string;
  productName: string;
  durationMonths: number;
  buyerName: string;
  customerName: string;
  buyPrice: number;
  sellPrice: number;
  warrantyStart: string; // ISO date
  notes?: string | null;
  customerNumber?: string | null;
  dealerNumber?: string | null;
  createdAt: string;
};

export const profit = (s: Sale) => s.sellPrice - s.buyPrice;

export const warrantyEnd = (s: Sale) =>
  addMonths(new Date(s.warrantyStart), s.durationMonths);

export const isExpired = (s: Sale, now: Date = new Date()) =>
  warrantyEnd(s).getTime() <= now.getTime();

export const daysRemaining = (s: Sale, now: Date = new Date()) =>
  differenceInCalendarDays(warrantyEnd(s), now);

export const formatMoney = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

export type DateRange = { from: Date; to: Date };

export const filterByRange = (sales: Sale[], range: DateRange | null) => {
  if (!range) return sales;
  const fromMs = range.from.getTime();
  const toMs = range.to.getTime();
  return sales.filter((s) => {
    const t = new Date(s.warrantyStart).getTime();
    return t >= fromMs && t <= toMs;
  });
};