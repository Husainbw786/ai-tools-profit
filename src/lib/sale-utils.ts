import { addMonths, differenceInCalendarDays, endOfDay, startOfDay } from "date-fns";

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

// Amount returned to the customer. A refund with no explicit amount is a full refund.
export const refundedAmount = (s: Sale) => (isRefunded(s) ? (s.refundAmount ?? lineTotal(s)) : 0);

// Revenue actually kept after refunds.
export const effectiveRevenue = (s: Sale) => lineTotal(s) - refundedAmount(s);

export const profit = (s: Sale) => effectiveRevenue(s) - lineCost(s);

/**
 * Derive a payment status from what has been paid against what is billed.
 * Shared by the client (previews) and the server (createSale) so both agree.
 */
export const derivePaymentStatus = (total: number, paid: number): PaymentStatus =>
  paid >= total ? "paid" : paid > 0 ? "partial" : "unpaid";

/**
 * Outstanding balance on a sale.
 *
 * - A refunded sale has nothing left to collect.
 * - A sale marked "paid" owes nothing, even if no payment rows exist (sales
 *   recorded before payment tracking was added have a status but no payments).
 * - Otherwise it is what is billed minus what has been recorded as paid.
 *
 * `paid` defaults to the amount aggregated by the server, but callers that
 * have a fresher payments list (e.g. the payments panel) can pass their own sum.
 */
export const balanceDue = (s: Sale, paid: number = s.amountPaid ?? 0) => {
  if (isRefunded(s) || s.paymentStatus === "paid") return 0;
  return Math.max(0, lineTotal(s) - paid);
};

// Margin relative to cost. Returns 0 when there is no cost to compare against.
export const marginPctOf = (profitAmount: number, cost: number) =>
  cost > 0 ? (profitAmount / cost) * 100 : 0;

// Per-sale margin, refund-aware so it matches the profit shown next to it.
export const marginPct = (s: Sale) => marginPctOf(profit(s), lineCost(s));

export const formatPct = (n: number) => {
  const rounded = Math.round(n);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
};

export const warrantyEnd = (s: Sale) => addMonths(new Date(s.warrantyStart), s.durationMonths);

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

/**
 * Keep sales whose start date falls within the range, inclusive of both days.
 * The bounds are widened to whole days so a "to" date picked from a calendar
 * (midnight) still includes sales recorded later that same day.
 */
export const filterByRange = (sales: Sale[], range: DateRange | null) => {
  if (!range) return sales;
  const fromMs = startOfDay(range.from).getTime();
  const toMs = endOfDay(range.to).getTime();
  return sales.filter((s) => {
    const t = new Date(s.warrantyStart).getTime();
    return t >= fromMs && t <= toMs;
  });
};

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const waUrl = (phone: string | null | undefined, text: string) => {
  const digits = (phone ?? "").replace(/[^0-9]/g, "");
  const encoded = encodeURIComponent(text);
  return digits ? `https://wa.me/${digits}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
};

export function buildWhatsAppMessage(s: Sale): string {
  const end = warrantyEnd(s);
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
  return waUrl(s.customerNumber, buildWhatsAppMessage(s));
}

export function buildReminderMessage(s: Sale): string {
  const due = balanceDue(s);
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
  return waUrl(s.customerNumber, buildReminderMessage(s));
}
