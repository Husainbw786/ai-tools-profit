import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  daysRemaining,
  formatPct,
  formatMoney,
  isExpired,
  isRefunded,
  marginPct,
  profit,
  warrantyEnd,
  balanceDue,
  type Sale,
} from "@/lib/sale-utils";

type Props = {
  sales: Sale[];
  onRowClick?: (s: Sale) => void;
  emptyText?: string;
};

const AVATAR_TINTS = [
  "bg-primary/15 text-primary",
  "bg-warning/20 text-warning-foreground",
  "bg-destructive/15 text-destructive",
  "bg-success/15 text-success",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-amber-500/20 text-amber-800 dark:text-amber-300",
];

function initials(name: string) {
  const parts = name
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function hashTint(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return AVATAR_TINTS[Math.abs(h) % AVATAR_TINTS.length];
}

export function SalesList({ sales, onRowClick, emptyText = "No sales yet." }: Props) {
  if (sales.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-card/50 py-14 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {sales.map((s) => {
        const expired = isExpired(s);
        const refunded = isRefunded(s);
        const end = warrantyEnd(s);
        const days = daysRemaining(s);
        const p = profit(s);
        const m = marginPct(s);
        const payColor =
          s.paymentStatus === "paid"
            ? "bg-success/15 text-success"
            : s.paymentStatus === "partial"
              ? "bg-warning/20 text-warning-foreground"
              : "bg-destructive/15 text-destructive";
        const payLabel =
          s.paymentStatus === "paid"
            ? "PAID"
            : s.paymentStatus === "partial"
              ? "PARTIAL"
              : "UNPAID";
        const due = balanceDue(s);
        const tint = hashTint(s.productName);
        const titleBase = s.productName.split(/[\s—-]+/)[0] || s.productName;
        const titleTail = s.productName.slice(titleBase.length).trim();
        return (
          <li
            key={s.id}
            onClick={() => onRowClick?.(s)}
            className={cn(
              "group relative cursor-pointer overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-card)] transition-all hover:border-primary/30 hover:shadow-[var(--shadow-elegant)]",
              (expired || refunded) && "opacity-65",
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "grid size-12 shrink-0 place-items-center rounded-2xl font-display text-sm font-bold tracking-tight",
                  tint,
                )}
              >
                {initials(s.productName)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="truncate font-display text-[15px] font-bold tracking-tight">
                    {titleBase}
                  </span>
                  {titleTail && (
                    <span className="truncate text-[13px] text-muted-foreground">
                      {titleTail}
                    </span>
                  )}
                  {s.quantity > 1 && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      ×{s.quantity}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
                  {s.customerName || "—"} · {s.durationMonths}mo
                </div>
              </div>
              <div className="text-right">
                <div
                  className={cn(
                    "font-display text-[15px] font-bold tracking-tight",
                    p >= 0 ? "text-primary" : "text-destructive",
                  )}
                >
                  {formatMoney(s.sellPrice)}
                </div>
                {s.buyPrice > 0 ? (
                  <div
                    className={cn(
                      "text-[10px] font-bold",
                      m >= 0 ? "text-success" : "text-destructive",
                    )}
                  >
                    {formatPct(m)}
                  </div>
                ) : (
                  <div className="text-[10px] text-muted-foreground">·</div>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-dashed border-border/70 pt-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {refunded ? (
                  <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-destructive">
                    REFUNDED
                  </span>
                ) : (
                  <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide",
                    payColor,
                  )}
                >
                  {payLabel}
                </span>
                )}
                {!refunded && due > 0 && (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                    {formatMoney(due)} DUE
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full bg-secondary/70 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground",
                  expired && "bg-muted text-muted-foreground",
                )}
              >
                <Clock className="size-3" />
                {expired
                  ? `Expired`
                  : `${days} D LEFT`}
              </span>
            </div>
            {/* keep warrantyEnd ref to avoid unused */}
            <span className="sr-only">{end.toISOString()}</span>
          </li>
        );
      })}
    </ul>
  );
}