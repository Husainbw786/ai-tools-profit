import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  daysRemaining,
  formatMoney,
  isExpired,
  profit,
  warrantyEnd,
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
      <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {sales.map((s) => {
        const expired = isExpired(s);
        const end = warrantyEnd(s);
        const days = daysRemaining(s);
        return (
          <li
            key={s.id}
            onClick={() => onRowClick?.(s)}
            className={cn(
              "cursor-pointer rounded-lg border bg-card p-3 transition hover:border-foreground/20",
              expired && "opacity-60",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{s.productName}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                      s.hasWarranty
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-muted-foreground/20 bg-muted text-muted-foreground",
                    )}
                  >
                    {s.hasWarranty ? "Warranty" : "No warranty"}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {s.customerName || "—"} · {s.durationMonths}mo
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatMoney(profit(s))}</div>
                <div className="text-xs text-muted-foreground">
                  {formatMoney(s.sellPrice)}
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {format(new Date(s.warrantyStart), "MMM d")} → {format(end, "MMM d, yyyy")}
              </span>
              <span className={cn(expired ? "" : days <= 7 && "text-foreground")}>
                {expired ? `Expired ${format(end, "MMM d")}` : `${days}d left`}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}