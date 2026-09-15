import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { Chip, EmptyState, Stat, StatGrid, UnderlineSearch } from "@/components/primitives";
import { useSales } from "@/hooks/use-sales";
import { useContacts } from "@/hooks/use-contacts";
import {
  buildContactSummaries,
  waLink,
  type ContactKind,
  type ContactSummary,
} from "@/lib/contacts-utils";
import { formatDateShort, formatMoney } from "@/lib/sale-utils";
import { cn } from "@/lib/utils";

type SortKey = "revenue" | "profit" | "dues" | "recent" | "name";

const sortLabel: Record<SortKey, string> = {
  revenue: "Revenue",
  profit: "Profit",
  dues: "Dues",
  recent: "Recent",
  name: "Name",
};

export function initials(name: string) {
  const parts = name
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function ContactsBrowser({ kind }: { kind: ContactKind }) {
  const { data: sales = [] } = useSales();
  const { data: contacts = [] } = useContacts();
  const [q, setQ] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("revenue");
  const [onlyDues, setOnlyDues] = useState(false);

  const summaries = useMemo(() => buildContactSummaries(sales, kind), [sales, kind]);

  const tagsByKey = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const c of contacts) {
      if (c.kind === kind) m.set(c.nameKey, c.tags);
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
    let rows = summaries.map((r) => ({ ...r, tags: tagsByKey.get(r.nameKey) ?? [] }));
    if (needle) {
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(needle) || (r.phone ?? "").toLowerCase().includes(needle),
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
  }, [summaries, tagsByKey, q, activeTag, onlyDues, sort]);

  const totals = useMemo(() => {
    const revenue = filtered.reduce((a, r) => a + r.revenue, 0);
    const dues = filtered.reduce((a, r) => a + r.duesAmount, 0);
    return { revenue, dues, count: filtered.length };
  }, [filtered]);

  const noun = kind === "customer" ? "Customers" : "Dealers";

  return (
    <div>
      <StatGrid cols={3} className="mt-[26px] py-4">
        <Stat label={noun} value={totals.count} />
        <Stat label="Revenue" value={formatMoney(totals.revenue)} />
        <Stat
          label="Outstanding"
          value={formatMoney(totals.dues)}
          valueClassName={cn(totals.dues > 0 && "text-destructive")}
        />
      </StatGrid>

      <UnderlineSearch
        className="mt-1.5"
        value={q}
        onChange={setQ}
        placeholder="Search name or phone"
      />

      <div className="mt-4 flex flex-wrap gap-1.5">
        {(Object.keys(sortLabel) as SortKey[]).map((k) => (
          <Chip key={k} active={sort === k} onClick={() => setSort(k)}>
            {sortLabel[k]}
          </Chip>
        ))}
        <Chip active={onlyDues} onClick={() => setOnlyDues((v) => !v)}>
          Dues only
        </Chip>
      </div>

      {allTags.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-bold text-faint">TAGS</span>
          {allTags.map((t) => (
            <Chip
              key={t}
              active={activeTag === t}
              onClick={() => setActiveTag(t === activeTag ? null : t)}
              className="px-2.5 py-1"
            >
              {t}
            </Chip>
          ))}
        </div>
      )}

      <ul className="mt-2">
        {filtered.length === 0 && <EmptyState>No matches.</EmptyState>}
        {filtered.map((r) => (
          <ContactRow key={r.nameKey} row={r} kind={kind} />
        ))}
      </ul>
    </div>
  );
}

function ContactRow({
  row,
  kind,
}: {
  row: ContactSummary & { tags: string[] };
  kind: ContactKind;
}) {
  const wa = waLink(row.phone);
  const detailPath =
    kind === "customer"
      ? `/customer/${encodeURIComponent(row.name)}`
      : `/dealer/${encodeURIComponent(row.name)}`;

  return (
    <li className="flex items-center gap-[14px] border-b border-hairline py-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-[13px] font-extrabold text-muted-foreground">
        {initials(row.name)}
      </span>
      <Link to={detailPath} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[15px] font-bold">{row.name}</span>
          {row.tags.slice(0, 2).map((t) => (
            <span
              key={t}
              className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
        <div className="mt-[3px] truncate text-[12px] text-muted-foreground">
          {row.orders} order{row.orders === 1 ? "" : "s"} · {formatMoney(row.revenue)} rev
          {row.lastPurchase ? ` · last ${formatDateShort(row.lastPurchase)}` : ""}
        </div>
        {row.duesAmount > 0 && (
          <div className="mt-[3px] text-[12px] font-bold text-destructive">
            {formatMoney(row.duesAmount)} due ({row.unpaidCount})
          </div>
        )}
      </Link>
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          title="WhatsApp"
          aria-label={`WhatsApp ${row.name}`}
          className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition hover:text-foreground"
        >
          <MessageCircle className="size-[15px]" strokeWidth={2.2} />
        </a>
      )}
    </li>
  );
}
