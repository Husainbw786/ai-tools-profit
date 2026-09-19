import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/primitives";
import { SaleRow } from "@/components/SalesList";
import { initials } from "@/lib/contacts-utils";
import { cn } from "@/lib/utils";
import { balanceDue, formatMoney, isRefunded, lineTotal, type Sale } from "@/lib/sale-utils";

export type GroupBy = "customer" | "dealer";

type Group = { key: string; rows: Sale[]; total: number; due: number };

const nameOf = (s: Sale, by: GroupBy) =>
  ((by === "customer" ? s.customerName : s.buyerName) || "").trim() || "Unknown";

/**
 * Active sales folded into one collapsible card per customer or dealer, biggest
 * first. Rows name the *other* party, since the card header already names one.
 */
export function SalesGroups({
  sales,
  groupBy,
  onRowClick,
  emptyText = "No active sales match.",
}: {
  sales: Sale[];
  groupBy: GroupBy;
  onRowClick?: (s: Sale) => void;
  emptyText?: string;
}) {
  // Cards start collapsed: a busy customer's rows would otherwise bury the
  // groups below them. Expanding is per card and resets when the view changes.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    for (const s of sales) {
      const key = nameOf(s, groupBy);
      const g = map.get(key) ?? { key, rows: [], total: 0, due: 0 };
      g.rows.push(s);
      g.total += lineTotal(s);
      g.due += isRefunded(s) ? 0 : balanceDue(s);
      map.set(key, g);
    }
    return [...map.values()].sort(
      (a, b) => b.rows.length - a.rows.length || a.key.localeCompare(b.key),
    );
  }, [sales, groupBy]);

  if (groups.length === 0) return <EmptyState>{emptyText}</EmptyState>;

  return (
    <div>
      {groups.map((g) => {
        const open = !!expanded[g.key];
        return (
          <div
            key={g.key}
            className="mt-3 overflow-hidden rounded-[18px] border border-border bg-card"
          >
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setExpanded((e) => ({ ...e, [g.key]: !open }))}
              className="flex w-full items-center gap-3 p-4 text-left"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-[13px] font-extrabold text-muted-foreground">
                {initials(g.key)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold">{g.key}</span>
                <span className="tabular mt-0.5 block truncate text-[12px] text-muted-foreground">
                  {g.rows.length} subscription{g.rows.length === 1 ? "" : "s"} ·{" "}
                  {formatMoney(g.total)}
                  {g.due > 0 && (
                    <span className="font-bold text-destructive"> · {formatMoney(g.due)} due</span>
                  )}
                </span>
              </span>
              <ChevronRight
                aria-hidden
                className={cn(
                  "size-[18px] shrink-0 text-faint transition-transform duration-150",
                  open && "rotate-90",
                )}
                strokeWidth={2.2}
              />
            </button>
            {open && (
              <ul className="px-4">
                {g.rows.map((s) => (
                  <SaleRow
                    key={s.id}
                    sale={s}
                    rule="top"
                    partyOf={groupBy === "customer" ? "dealer" : "customer"}
                    onClick={onRowClick}
                  />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
