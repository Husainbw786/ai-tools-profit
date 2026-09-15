import { addMonths, differenceInCalendarDays } from "date-fns";

export type PaymentStatus = "paid" | "unpaid" | "partial";

export type Sale = {
  id: string;
  productName: string;
  durationMonths: number;
  quantity: number;
  buyerName: string;
  customerName: string;
  buyPrice: number;
  sellPrice: number;
  warrantyStart: string; // ISO date
  notes?: string | null;
  customerNumber?: string | null;
  dealerNumber?: string | null;
  hasWarranty: boolean;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  createdAt: string;
  refundedAt?: string | null;
  refundAmount?: number | null;
  refundReason?: string | null;
};

export const isRefunded = (s: Sale) => !!s.refundedAt;

const qty = (s: Sale) => s.quantity || 1;

// Total billed for the line item (per-unit price × quantity)
export const lineTotal = (s: Sale) => s.sellPrice * qty(s);

export const lineCost = (s: Sale) => s.buyPrice * qty(s);

export const effectiveRevenue = (s: Sale) =>
  isRefunded(s) ? lineTotal(s) - (s.refundAmount ?? lineTotal(s)) : lineTotal(s);

export const profit = (s: Sale) => effectiveRevenue(s) - lineCost(s);

export const balanceDue = (s: Sale) =>
  Math.max(0, lineTotal(s) - (s.amountPaid ?? 0));

export const marginPct = (s: Sale) =>
  s.buyPrice > 0 ? ((s.sellPrice - s.buyPrice) / s.buyPrice) * 100 : 0;

export const formatPct = (n: number) =>
  `${n > 0 ? "+" : ""}${n.toFixed(0)}%`;

export const warrantyEnd = (s: Sale) =>
  addMonths(new Date(s.warrantyStart), s.durationMonths);

export const isExpired = (s: Sale, now: Date = new Date()) =>
  warrantyEnd(s).getTime() <= now.getTime();

export const daysRemaining = (s: Sale, now: Date = new Date()) =>
  differenceInCalendarDays(warrantyEnd(s), now);

export type UrgencyLevel = "expired" | "urgent" | "warning" | "healthy";

export const urgencyLevel = (s: Sale, now: Date = new Date()): UrgencyLevel => {
  if (isExpired(s, now)) return "expired";
  const d = daysRemaining(s, now);
  if (d <= 7) return "urgent";
  if (d <= 30) return "warning";
  return "healthy";
};

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

export function buildWhatsAppMessage(s: Sale): string {
  const end = warrantyEnd(s);
  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const statusLine =
    s.paymentStatus === "paid"
      ? "✅ Paid"
      : s.paymentStatus === "partial"
        ? "🟠 Partial payment"
        : "🔴 Payment pending";
  const qty = s.quantity && s.quantity > 1 ? s.quantity : null;
  const lines = [
    `*${s.productName}*${qty ? ` × ${qty}` : ""}`,
    s.customerName ? `Customer: ${s.customerName}` : null,
    `Duration: ${s.durationMonths} month${s.durationMonths === 1 ? "" : "s"}`,
    qty ? `Quantity: ${qty}` : null,
    s.hasWarranty
      ? `Warranty: ${fmtDate(new Date(s.warrantyStart))} → ${fmtDate(end)}`
      : `Start: ${fmtDate(new Date(s.warrantyStart))}`,
    `Amount: ${formatMoney(lineTotal(s))}`,
    statusLine,
    "",
    "_Sent via ProfitAI_",
  ].filter(Boolean);
  return lines.join("\n");
}

export function whatsAppUrl(s: Sale): string {
  const phone = (s.customerNumber ?? "").replace(/[^0-9]/g, "");
  const text = encodeURIComponent(buildWhatsAppMessage(s));
  return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function buildReminderMessage(s: Sale): string {
  const due = balanceDue(s);
  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const paid = s.amountPaid ?? 0;
  const lines = [
    `Hi${s.customerName ? ` ${s.customerName}` : ""},`,
    "",
    `This is a gentle reminder for the pending payment on:`,
    `*${s.productName}*${s.quantity > 1 ? ` × ${s.quantity}` : ""}`,
    `Sold on: ${fmtDate(new Date(s.warrantyStart))}`,
    `Total: ${formatMoney(lineTotal(s))}`,
    paid > 0 ? `Paid so far: ${formatMoney(paid)}` : null,
    `*Balance due: ${formatMoney(due)}*`,
    "",
    "Please confirm once paid. Thank you!",
  ].filter(Boolean);
  return lines.join("\n");
}

export function reminderWhatsAppUrl(s: Sale): string {
  const phone = (s.customerNumber ?? "").replace(/[^0-9]/g, "");
  const text = encodeURIComponent(buildReminderMessage(s));
  return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
}