import { format } from "date-fns";
import { ChevronRight, Clock, MessageCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  daysRemaining,
  formatPct,
  formatMoney,
  isExpired,
  marginPct,
  profit,
  urgencyLevel,
  warrantyEnd,
  whatsAppUrl,
  balanceDue,
  type Sale,
} from "@/lib/sale-utils";

type Props = {
  sales: Sale[];
  onRowClick?: (s: Sale) => void;
  emptyText?: string;
};

export function SalesList({ sales, onRowClick, emptyText = "No sales yet." }: Props) {
  if (sales.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-card/50 py-14 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }
  return (
    <ul className="space-y-2.5">
      {sales.map((s) => {
        const expired = isExpired(s);
        const end = warrantyEnd(s);
        const days = daysRemaining(s);
        const level = urgencyLevel(s);
        const p = profit(s);
        const m = marginPct(s);
        const barColor =
          level === "expired"
            ? "bg-muted"
            : level === "urgent"
              ? "bg-destructive"
              : level === "warning"
                ? "bg-warning"
                : "bg-success";
        const chipColor =
          level === "expired"
            ? "bg-muted text-muted-foreground"
            : level === "urgent"
              ? "bg-destructive/10 text-destructive"
              : level === "warning"
                ? "bg-warning/15 text-warning-foreground"
                : "bg-success/10 text-success";
        const payColor =
          s.paymentStatus === "paid"
            ? "bg-success/10 text-success"
            : s.paymentStatus === "partial"
              ? "bg-warning/15 text-warning-foreground"
              : "bg-destructive/10 text-destructive";
        const payLabel =
          s.paymentStatus === "paid"
            ? "Paid"
            : s.paymentStatus === "partial"
              ? "Partial"
              : "Unpaid";
        const due = balanceDue(s);
        return (
          <li
            key={s.id}
            onClick={() => onRowClick?.(s)}
            className={cn(
              "group relative cursor-pointer overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-elegant)] active:translate-y-0",
              expired && "opacity-65",
            )}
          >
            <div
              aria-hidden
              className={cn("absolute left-0 top-0 h-full w-1", barColor)}
            />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate font-display text-[15px] font-semibold tracking-tight">
                    {s.productName}
                  </span>
                  {s.quantity > 1 && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      ×{s.quantity}
                    </span>
                  )}
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                      payColor,
                    )}
                  >
                    {payLabel}
                  </span>
                  {due > 0 && (
                    <span className="shrink-0 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                      {formatMoney(due)} due
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  {s.customerName ? (
                    <Link
                      to="/customer/$name"
                      params={{ name: s.customerName }}
                      onClick={(e) => e.stopPropagation()}
                      className="truncate hover:text-accent hover:underline"
                    >
                      {s.customerName}
                    </Link>
                  ) : (
                    <span className="truncate">—</span>
                  )}
                  <span className="text-border">•</span>
                  <span className="shrink-0">{s.durationMonths}mo</span>
                  {s.hasWarranty && (
                    <span className="ml-1 shrink-0 rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent">
                      Warr
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div
                    className={cn(
                      "font-display text-base font-bold tracking-tight",
                      p > 0 ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {formatMoney(p)}
                  </div>
                  {s.buyPrice > 0 ? (
                    <div
                      className={cn(
                        "text-[10px] font-semibold",
                        m >= 0 ? "text-success" : "text-destructive",
                      )}
                    >
                      {formatPct(m)} margin
                    </div>
                  ) : (
                    <div className="text-[10px] text-muted-foreground">
                      sold {formatMoney(s.sellPrice)}
                    </div>
                  )}
                </div>
                <ChevronRight className="size-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5 text-[11px]">
              <span className="text-muted-foreground">
                {format(new Date(s.warrantyStart), "MMM d")} →{" "}
                {format(end, "MMM d, yyyy")}
              </span>
              <div className="flex items-center gap-1.5">
                <a
                  href={whatsAppUrl(s)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Share on WhatsApp"
                  className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 font-medium text-success hover:bg-success/20"
                >
                  <MessageCircle className="size-3" />
                  WA
                </a>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
                    chipColor,
                  )}
                >
                  <Clock className="size-3" />
                  {expired ? `Expired ${format(end, "MMM d")}` : `${days}d left`}
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}