import { cn } from "@/lib/utils";
import { EmptyState, StatusDot } from "@/components/primitives";
import {
  balanceDue,
  daysRemaining,
  formatDate,
  formatMoney,
  formatPct,
  isExpired,
  isRefunded,
  lineTotal,
  marginPct,
  statusDotClass,
  statusLabel,
  warrantyEnd,
  type Sale,
} from "@/lib/sale-utils";

type Props = {
  sales: Sale[];
  onRowClick?: (s: Sale) => void;
  emptyText?: string;
  /** Which party to show in the sub line. Contact pages show the *other* one. */
  partyOf?: "customer" | "dealer";
};

export function SalesList({
  sales,
  onRowClick,
  emptyText = "No sales yet.",
  partyOf = "customer",
}: Props) {
  if (sales.length === 0) {
    return <EmptyState>{emptyText}</EmptyState>;
  }
  return (
    <ul>
      {sales.map((s) => (
        <SaleRow key={s.id} sale={s} onClick={onRowClick} partyOf={partyOf} />
      ))}
    </ul>
  );
}

export function SaleRow({
  sale: s,
  onClick,
  partyOf = "customer",
}: {
  sale: Sale;
  onClick?: (s: Sale) => void;
  partyOf?: "customer" | "dealer";
}) {
  const expired = isExpired(s);
  const refunded = isRefunded(s);
  const due = balanceDue(s);
  const qty = s.quantity || 1;
  const who = partyOf === "customer" ? s.customerName : s.buyerName;
  const when = refunded
    ? null
    : !s.hasWarranty
      ? "No warranty"
      : expired
        ? `Expired ${formatDate(warrantyEnd(s))}`
        : `${daysRemaining(s)} d left`;
  const sub = [who || null, statusLabel(s), when].filter(Boolean).join(" · ");
  const showDue = due > 0 && !refunded;

  return (
    <li
      onClick={() => onClick?.(s)}
      className={cn(
        "flex items-center gap-[14px] border-b border-hairline py-4",
        onClick && "cursor-pointer",
        (expired || refunded) && "opacity-60",
      )}
    >
      <StatusDot className={statusDotClass(s)} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-bold tracking-[-0.01em]">
          {s.productName}{" "}
          <span className="text-[12px] font-semibold text-faint">
            {s.durationMonths} mo{qty > 1 ? ` · ×${qty}` : ""}
          </span>
        </div>
        <div className="mt-[3px] truncate text-[12px] text-muted-foreground">{sub}</div>
      </div>
      <div className="tabular shrink-0 text-right">
        <div className="text-[15px] font-bold">{formatMoney(lineTotal(s))}</div>
        <div
          className={cn(
            "mt-0.5 text-[11px] font-bold",
            showDue ? "text-destructive" : "text-accent-text",
          )}
        >
          {showDue ? `${formatMoney(due)} due` : formatPct(marginPct(s))}
        </div>
      </div>
    </li>
  );
}
