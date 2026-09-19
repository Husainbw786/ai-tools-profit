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

// Money actually collected from the customer. A sale marked "paid" counts as
// fully collected even when it predates the payments ledger (no payment rows);
// otherwise it is the sum of recorded payments, capped at the line total.
export const amountCollected = (s: Sale) =>
  s.paymentStatus === "paid" ? lineTotal(s) : Math.min(lineTotal(s), s.amountPaid ?? 0);

// Revenue kept after refunds. A refunded sale keeps only what was collected
// minus what was returned; a cancelled unpaid sale therefore contributes 0.
export const effectiveRevenue = (s: Sale) => {
  if (!isRefunded(s)) return lineTotal(s);
  const collected = amountCollected(s);
  return Math.max(0, collected - (s.refundAmount ?? collected));
};

export const profit = (s: Sale) => effectiveRevenue(s) - lineCost(s);

// Outstanding balance. Nothing is due on a refunded sale or one marked paid.
export const balanceDue = (s: Sale) =>
  isRefunded(s) ? 0 : Math.max(0, lineTotal(s) - amountCollected(s));

// Profit as a percentage of cost, net of refunds. Equals (sell − buy) / buy
// for a normal sale; quantity cancels out.
export const marginPct = (s: Sale) => {
  const cost = lineCost(s);
  return cost > 0 ? (profit(s) / cost) * 100 : 0;
};

export const formatPct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(0)}%`;

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

export const filterByRange = (sales: Sale[], range: DateRange | null) => {
  if (!range) return sales;
  const fromMs = range.from.getTime();
  const toMs = range.to.getTime();
  return sales.filter((s) => {
    const t = new Date(s.warrantyStart).getTime();
    return t >= fromMs && t <= toMs;
  });
};

/** Who a sale message goes to. */
export type MessageRecipient = "customer" | "dealer";

export const recipientName = (s: Sale, to: MessageRecipient) =>
  (to === "customer" ? s.customerName : s.buyerName).trim();

export const recipientPhone = (s: Sale, to: MessageRecipient) =>
  (to === "customer" ? s.customerNumber : s.dealerNumber) ?? null;

/**
 * wa.me link for an arbitrary text. Without a number WhatsApp opens with the
 * text prefilled and asks which chat to send it to.
 */
export function whatsAppShareUrl(phone: string | null | undefined, text: string): string {
  const digits = (phone ?? "").replace(/[^0-9]/g, "");
  const q = `?text=${encodeURIComponent(text)}`;
  return digits ? `https://wa.me/${digits}${q}` : `https://wa.me/${q}`;
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

/**
 * Personalised purchase confirmation for the customer: what they bought, at
 * what rate, what they paid and how long it is covered.
 */
export function buildCustomerConfirmationMessage(s: Sale): string {
  const q = qty(s);
  const name = firstName(s.customerName);
  const total = lineTotal(s);
  const collected = amountCollected(s);
  const due = balanceDue(s);
  const paymentLine = isRefunded(s)
    ? `Payment: ↩️ Refunded ${formatMoney(s.refundAmount ?? collected)}`
    : due <= 0
      ? "Payment: ✅ Paid in full"
      : collected > 0
        ? `Payment: 🟠 ${formatMoney(collected)} received · *${formatMoney(due)} balance due*`
        : `Payment: 🔴 *${formatMoney(due)} due*`;
  const lines = [
    `Hi${name ? ` ${name}` : ""}! 👋`,
    "",
    "Thank you for your purchase. Here are your subscription details:",
    "",
    `*${s.productName}*${q > 1 ? ` × ${q}` : ""}`,
    `Plan: ${plural(s.durationMonths, "month")}`,
    q > 1 ? `Rate: ${formatMoney(s.sellPrice)} each` : `Price: ${formatMoney(s.sellPrice)}`,
    q > 1 ? `Total: ${formatMoney(total)}` : null,
    paymentLine,
    `Active from: ${formatDate(s.warrantyStart)}`,
    s.hasWarranty
      ? `Warranty till: ${formatDate(warrantyEnd(s))}`
      : `Valid till: ${formatDate(warrantyEnd(s))}`,
    "",
    s.hasWarranty
      ? "If anything stops working during the warranty period, just message me here and I'll sort it out right away."
      : "If you need any help with the subscription, just message me here.",
    "",
    "Thanks for choosing us! 🙏",
  ].filter((l): l is string => l !== null);
  return lines.join("\n");
}

/**
 * Purchase confirmation to the dealer: the items to supply, at the agreed
 * buy rate, and a request to confirm. Several sales from one order share a
 * single message.
 */
export function buildDealerOrderMessage(sales: Sale | Sale[]): string {
  const items = Array.isArray(sales) ? sales : [sales];
  if (items.length === 0) return "";
  const name = items[0].buyerName.trim();
  const orderTotal = items.reduce((a, s) => a + lineCost(s), 0);
  const blocks = items.map((s) => {
    const q = qty(s);
    return [
      `*${s.productName}*${q > 1 ? ` × ${q}` : ""}`,
      `Plan: ${plural(s.durationMonths, "month")}`,
      q > 1 ? `Rate: ${formatMoney(s.buyPrice)} each` : `Price: ${formatMoney(s.buyPrice)}`,
      q > 1 ? `Total: ${formatMoney(lineCost(s))}` : null,
      `Start: ${formatDate(s.warrantyStart)}`,
      `Warranty: ${s.hasWarranty ? `${plural(s.durationMonths, "month")} (required)` : "not required"}`,
    ]
      .filter((l): l is string => l !== null)
      .join("\n");
  });
  const lines = [
    `Hi${name ? ` ${name}` : ""},`,
    "",
    items.length > 1 ? "Please confirm this order:" : "Please confirm this purchase:",
    "",
    blocks.join("\n\n"),
    items.length > 1 ? `\n*Order total: ${formatMoney(orderTotal)}*` : null,
    "",
    "Reply to confirm availability and share the activation details. Thank you!",
  ].filter((l): l is string => l !== null);
  return lines.join("\n");
}

export function buildSaleMessage(s: Sale, to: MessageRecipient): string {
  return to === "customer" ? buildCustomerConfirmationMessage(s) : buildDealerOrderMessage(s);
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
  return whatsAppShareUrl(s.customerNumber, buildReminderMessage(s));
}

/** Renewal nudge for a subscription whose warranty is about to run out. */
export function buildRenewalMessage(s: Sale): string {
  const left = daysRemaining(s);
  const when = left <= 0 ? "expires today" : `expires in ${plural(left, "day")}`;
  const name = firstName(s.customerName);
  return [
    `Hi${name ? ` ${name}` : ""},`,
    "",
    `Your *${s.productName}* subscription ${when} (${formatDate(warrantyEnd(s))}).`,
    `Would you like to renew for another ${plural(s.durationMonths, "month")} at ${formatMoney(lineTotal(s))}?`,
    "",
    "Reply here and I will set it up. Thank you!",
  ].join("\n");
}

export function renewalWhatsAppUrl(s: Sale): string {
  return whatsAppShareUrl(s.customerNumber, buildRenewalMessage(s));
}

// Compact rupee label for chart bars: ₹1.7k, ₹12k, ₹850.
export function formatCompactMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) {
    const k = abs / 1000;
    return `${n < 0 ? "-" : ""}₹${k.toFixed(abs >= 10000 ? 0 : 1)}k`;
  }
  return formatMoney(n);
}

export const formatDate = (iso: string | Date) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export const formatDateShort = (iso: string | Date) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export const statusLabel = (s: Sale) =>
  isRefunded(s)
    ? "Refunded"
    : s.paymentStatus === "paid"
      ? "Paid"
      : s.paymentStatus === "partial"
        ? "Partial"
        : "Unpaid";

// Status colour classes for the 7px dot and the tinted tag.
export const statusDotClass = (s: Sale) =>
  isRefunded(s)
    ? "bg-faint"
    : s.paymentStatus === "paid"
      ? "bg-success"
      : s.paymentStatus === "partial"
        ? "bg-warning"
        : "bg-destructive";

export const statusTagClass = (s: Sale) =>
  isRefunded(s)
    ? "bg-secondary text-muted-foreground"
    : s.paymentStatus === "paid"
      ? "bg-success-soft text-success"
      : s.paymentStatus === "partial"
        ? "bg-warning-soft text-warning"
        : "bg-destructive-soft text-destructive";
