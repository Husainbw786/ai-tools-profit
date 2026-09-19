import { useMemo, useState } from "react";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { Chip, EmptyState } from "@/components/primitives";
import { initials } from "@/lib/contacts-utils";
import { cn } from "@/lib/utils";
import {
  balanceDue,
  daysRemaining,
  formatDate,
  formatMoney,
  isExpired,
  isRefunded,
  renewalWhatsAppUrl,
  warrantyEnd,
  type Sale,
} from "@/lib/sale-utils";

/** How far ahead the list looks. `Infinity` = every active subscription. */
const WINDOWS = [
  { id: 7, label: "7 days" },
  { id: 30, label: "30 days" },
  { id: Infinity, label: "All active" },
] as const;

const BUCKETS: { label: string; match: (days: number) => boolean }[] = [
  { label: "This week", match: (d) => d <= 7 },
  { label: "Next 30 days", match: (d) => d > 7 && d <= 30 },
  { label: "Later", match: (d) => d > 30 },
];

/** Big numeral colour: red inside three days, amber inside a week. */
const daysTone = (d: number) =>
  d <= 3 ? "text-destructive" : d <= 7 ? "text-warning" : "text-foreground";

/**
 * Warranties running out, soonest first, bucketed by urgency. Each row opens
 * the sale, or sends the customer a renewal nudge on WhatsApp.
 */
export function ExpiringSoon({
  sales,
  onRowClick,
  className,
}: {
  sales: Sale[];
  onRowClick?: (s: Sale) => void;
  className?: string;
}) {
  const [horizon, setHorizon] = useState<number>(30);

  const upcoming = useMemo(
    () =>
      sales
        .filter((s) => s.hasWarranty && !isExpired(s))
        .sort((a, b) => daysRemaining(a) - daysRemaining(b)),
    [sales],
  );
  const inWindow = upcoming.filter((s) => daysRemaining(s) <= horizon);

  const groups = BUCKETS.map((b) => ({
    label: b.label,
    rows: inWindow.filter((s) => b.match(daysRemaining(s))),
  })).filter((g) => g.rows.length > 0);

  return (
    <section className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-section">Expiring soon</h2>
        <span className="shrink-0 rounded-full bg-secondary px-[9px] py-[3px] text-[12px] font-bold text-muted-foreground">
          {inWindow.length}
        </span>
      </div>

      <div className="mt-3 flex gap-1.5">
        {WINDOWS.map((w) => (
          <Chip key={w.label} active={horizon === w.id} onClick={() => setHorizon(w.id)}>
            {w.label}
          </Chip>
        ))}
      </div>

      {groups.length === 0 ? (
        <EmptyState>No subscriptions expiring in this window.</EmptyState>
      ) : (
        groups.map((g) => (
          <div key={g.label}>
            <div className="text-kicker mt-[22px] uppercase text-muted-foreground">
              {g.label} · {g.rows.length}
            </div>
            <ul>
              {g.rows.map((s) => (
                <ExpiringRow key={s.id} sale={s} onClick={onRowClick} />
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}

function ExpiringRow({ sale: s, onClick }: { sale: Sale; onClick?: (s: Sale) => void }) {
  const left = Math.max(0, daysRemaining(s));
  const due = isRefunded(s) ? 0 : balanceDue(s);
  const who = s.customerName || "Unknown customer";

  return (
    <li className="flex items-center gap-3 border-b border-hairline py-3.5">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-[13px] font-extrabold text-muted-foreground">
        {initials(who)}
      </span>
      <button type="button" onClick={() => onClick?.(s)} className="min-w-0 flex-1 text-left">
        <div className="truncate text-[15px] font-bold">{who}</div>
        <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
          {s.productName} · {s.durationMonths} mo · ends {formatDate(warrantyEnd(s))}
        </div>
        {due > 0 && (
          <div className="mt-0.5 text-[11px] font-bold text-destructive">
            {formatMoney(due)} due
          </div>
        )}
      </button>
      <div className="w-10 shrink-0 text-right">
        <div className={cn("text-countdown", daysTone(left))}>{left}</div>
        <div className="mt-[3px] text-[10px] font-bold uppercase tracking-[0.06em] text-faint">
          {left === 0 ? "today" : left === 1 ? "day" : "days"}
        </div>
      </div>
      <a
        href={renewalWhatsAppUrl(s)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Send ${who} a renewal message on WhatsApp`}
        className="grid size-[30px] shrink-0 place-items-center rounded-full bg-whatsapp text-white transition hover:bg-whatsapp/90"
      >
        <WhatsAppIcon className="size-[14px]" />
      </a>
    </li>
  );
}
