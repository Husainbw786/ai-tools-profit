import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessageCircle, Phone, Search, Tag as TagIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSales } from "@/hooks/use-sales";
import { useContacts } from "@/hooks/use-contacts";
import {
  buildContactSummaries,
  tagColor,
  telLink,
  waLink,
  type ContactKind,
  type ContactSummary,
} from "@/lib/contacts-utils";
import { formatMoney } from "@/lib/sale-utils";
import { cn } from "@/lib/utils";

type SortKey = "revenue" | "profit" | "dues" | "recent" | "name";

const sortLabel: Record<SortKey, string> = {
  revenue: "Revenue",
  profit: "Profit",
  dues: "Dues",
  recent: "Recent",
  name: "Name",
};

export function ContactsBrowser({ kind }: { kind: ContactKind }) {
  const { data: sales = [] } = useSales();
  const { data: contacts = [] } = useContacts();
  const [q, setQ] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("revenue");
  const [onlyDues, setOnlyDues] = useState(false);

  const summaries = useMemo(
    () => buildContactSummaries(sales, kind),
    [sales, kind],
  );

  const tagsByKey = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const c of contacts) {
      if (c.kind === kind) m.set(c.nameKey, c.tags);
    }
    return m;
  }, [contacts, kind]);

  const notesByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of contacts) {
      if (c.kind === kind && c.notes) m.set(c.nameKey, c.notes);
    }
    return m;
  }, [contacts, kind]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const tags of tagsByKey.values()) tags.forEach((t) => set.add(t));
    return Array.from(set).sort();
  }, [tagsByKey]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let rows = summaries.map((r) => ({
      ...r,
      tags: tagsByKey.get(r.nameKey) ?? [],
      notes: notesByKey.get(r.nameKey) ?? null,
    }));
    if (needle) {
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(needle) ||
          (r.phone ?? "").toLowerCase().includes(needle),
      );
    }
    if (activeTag) rows = rows.filter((r) => r.tags.includes(activeTag));
    if (onlyDues) rows = rows.filter((r) => r.duesAmount > 0);
    rows.sort((a, b) => {
      switch (sort) {
        case "profit":
          return b.totalProfit - a.totalProfit;
        case "dues":
          return b.duesAmount - a.duesAmount;
        case "recent":
          return (b.lastPurchase ?? "").localeCompare(a.lastPurchase ?? "");
        case "name":
          return a.name.localeCompare(b.name);
        case "revenue":
        default:
          return b.revenue - a.revenue;
      }
    });
    return rows;
  }, [summaries, tagsByKey, notesByKey, q, activeTag, onlyDues, sort]);

  const totals = useMemo(() => {
    const revenue = filtered.reduce((a, r) => a + r.revenue, 0);
    const dues = filtered.reduce((a, r) => a + r.duesAmount, 0);
    return { revenue, dues, count: filtered.length };
  }, [filtered]);

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/70 bg-card p-3 shadow-[var(--shadow-soft)]">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {kind === "customer" ? "Customers" : "Dealers"}
          </div>
          <div className="mt-1 font-display text-lg font-semibold tracking-tight">
            {totals.count}
          </div>
        </Card>
        <Card className="border-border/70 bg-card p-3 shadow-[var(--shadow-soft)]">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Revenue
          </div>
          <div className="mt-1 font-display text-lg font-semibold tracking-tight">
            {formatMoney(totals.revenue)}
          </div>
        </Card>
        <Card className="border-border/70 bg-card p-3 shadow-[var(--shadow-soft)]">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Outstanding
          </div>
          <div
            className={cn(
              "mt-1 font-display text-lg font-semibold tracking-tight",
              totals.dues > 0 && "text-destructive",
            )}
          >
            {formatMoney(totals.dues)}
          </div>
        </Card>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${kind === "customer" ? "customers" : "dealers"} or phone…`}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(Object.keys(sortLabel) as SortKey[]).map((k) => (
            <Button
              key={k}
              type="button"
              size="sm"
              variant={sort === k ? "default" : "outline"}
              onClick={() => setSort(k)}
              className="h-8 rounded-full px-3 text-xs"
            >
              {sortLabel[k]}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant={onlyDues ? "default" : "outline"}
            onClick={() => setOnlyDues((v) => !v)}
            className="h-8 rounded-full px-3 text-xs"
          >
            Dues only
          </Button>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <TagIcon className="size-3.5 text-muted-foreground" />
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition",
              activeTag === null
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-secondary text-secondary-foreground",
            )}
          >
            All
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTag(t === activeTag ? null : t)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition",
                activeTag === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : tagColor(t),
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 space-y-2">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/70 px-3 py-8 text-center text-xs text-muted-foreground">
            No {kind === "customer" ? "customers" : "dealers"} match.
          </div>
        )}
        {filtered.map((r) => (
          <ContactRow key={r.nameKey} row={r} kind={kind} />
        ))}
      </div>
    </div>
  );
}

function ContactRow({
  row,
  kind,
}: {
  row: ContactSummary & { tags: string[]; notes: string | null };
  kind: ContactKind;
}) {
  const tel = telLink(row.phone);
  const wa = waLink(row.phone);
  const detailPath =
    kind === "customer"
      ? `/customer/${encodeURIComponent(row.name)}`
      : `/dealer/${encodeURIComponent(row.name)}`;

  return (
    <Card className="group border-border/70 bg-card p-3 shadow-[var(--shadow-soft)] transition hover:border-primary/40">
      <div className="flex items-start gap-3">
        <Link to={detailPath} className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate font-display text-sm font-semibold tracking-tight">
              {row.name}
            </div>
            {row.tags.slice(0, 3).map((t) => (
              <Badge
                key={t}
                variant="outline"
                className={cn("h-5 rounded-full border px-2 text-[10px]", tagColor(t))}
              >
                {t}
              </Badge>
            ))}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{row.orders} order{row.orders === 1 ? "" : "s"}</span>
            <span>•</span>
            <span>{formatMoney(row.revenue)} rev</span>
            {row.lastPurchase && (
              <>
                <span>•</span>
                <span>
                  Last{" "}
                  {new Date(row.lastPurchase).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </>
            )}
          </div>
          {row.duesAmount > 0 && (
            <div className="mt-1 text-[11px] font-medium text-destructive">
              {formatMoney(row.duesAmount)} due ({row.unpaidCount})
            </div>
          )}
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          {tel && (
            <a
              href={tel}
              className="grid size-8 place-items-center rounded-full border border-border/70 text-muted-foreground hover:text-foreground"
              title="Call"
            >
              <Phone className="size-3.5" />
            </a>
          )}
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="grid size-8 place-items-center rounded-full border border-success/30 text-success hover:bg-success/10"
              title="WhatsApp"
            >
              <MessageCircle className="size-3.5" />
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}