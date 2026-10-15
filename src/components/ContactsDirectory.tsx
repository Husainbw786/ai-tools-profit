import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { EmptyState, SegmentedPill, UnderlineSearch } from "@/components/primitives";
import { SkeletonRows } from "@/components/skeletons";
import { useSales } from "@/hooks/use-sales";
import { useContacts } from "@/hooks/use-contacts";
import {
  buildContactSummaries,
  initials,
  telLink,
  waLink,
  type ContactKind,
} from "@/lib/contacts-utils";

type Filter = "all" | ContactKind;

type Entry = {
  kind: ContactKind;
  name: string;
  nameKey: string;
  phone: string | null;
  orders: number;
  tags: string[];
};

const KIND_LABEL: Record<ContactKind, string> = { dealer: "Dealer", customer: "Customer" };

/** First letter for the A–Z section headers; digits and symbols share "#". */
function letterOf(name: string) {
  const c = name.trim().charAt(0).normalize("NFD").charAt(0).toUpperCase();
  return /\p{L}/u.test(c) ? c : "#";
}

/** Every dealer and customer in one alphabetical phone book. */
export function ContactsDirectory() {
  const { data: sales = [], isPending } = useSales();
  const { data: contacts = [] } = useContacts();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const entries = useMemo(() => {
    const byKey = new Map<string, Entry>();
    for (const kind of ["dealer", "customer"] as const) {
      for (const s of buildContactSummaries(sales, kind)) {
        byKey.set(`${kind}:${s.nameKey}`, {
          kind,
          name: s.name,
          nameKey: s.nameKey,
          phone: s.phone,
          orders: s.orders,
          tags: [],
        });
      }
    }
    // Saved contacts carry tags, and may exist without any sale yet.
    for (const c of contacts) {
      const key = `${c.kind}:${c.nameKey}`;
      const hit = byKey.get(key);
      if (hit) hit.tags = c.tags;
      else
        byKey.set(key, {
          kind: c.kind,
          name: c.displayName,
          nameKey: c.nameKey,
          phone: null,
          orders: 0,
          tags: c.tags,
        });
    }
    return Array.from(byKey.values()).sort(
      (a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) ||
        a.kind.localeCompare(b.kind),
    );
  }, [sales, contacts]);

  const counts = useMemo(() => {
    const dealer = entries.filter((e) => e.kind === "dealer").length;
    return { all: entries.length, dealer, customer: entries.length - dealer };
  }, [entries]);

  const sections = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const digits = needle.replace(/[^0-9]/g, "");
    const rows = entries.filter((e) => {
      if (filter !== "all" && e.kind !== filter) return false;
      if (!needle) return true;
      return (
        e.nameKey.includes(needle) ||
        e.tags.some((t) => t.toLowerCase().includes(needle)) ||
        (digits.length > 0 && (e.phone ?? "").replace(/[^0-9]/g, "").includes(digits))
      );
    });
    const groups: { letter: string; rows: Entry[] }[] = [];
    for (const r of rows) {
      const letter = letterOf(r.name);
      const last = groups[groups.length - 1];
      if (last && last.letter === letter) last.rows.push(r);
      else groups.push({ letter, rows: [r] });
    }
    // "#" names sort first by localeCompare; list them last like a phone book.
    groups.sort((a, b) => Number(a.letter === "#") - Number(b.letter === "#"));
    return groups;
  }, [entries, filter, q]);

  const options: { id: Filter; label: string }[] = [
    { id: "all", label: `All ${isPending ? "" : counts.all}`.trim() },
    { id: "dealer", label: `Dealers ${isPending ? "" : counts.dealer}`.trim() },
    { id: "customer", label: `Customers ${isPending ? "" : counts.customer}`.trim() },
  ];

  return (
    <div>
      <SegmentedPill grow className="mt-6" options={options} value={filter} onChange={setFilter} />
      <p className="mt-2 text-[12px] text-muted-foreground">
        Dealers are who you buy from; customers are who you sell to.
      </p>

      <UnderlineSearch
        className="mt-3"
        value={q}
        onChange={setQ}
        placeholder="Search name, phone or tag"
      />

      <div className="mt-2">
        {isPending && <SkeletonRows count={6} />}
        {!isPending && sections.length === 0 && (
          <EmptyState>
            {entries.length === 0
              ? "No contacts yet. Add a sale to start your list."
              : "No matches."}
          </EmptyState>
        )}
        {sections.map((s) => (
          <section key={s.letter} aria-label={s.letter}>
            <h2 className="sticky top-0 z-10 bg-background pb-1 pt-4 text-[11px] font-bold text-faint md:top-[69px]">
              {s.letter}
            </h2>
            <ul>
              {s.rows.map((r) => (
                <DirectoryRow key={`${r.kind}:${r.nameKey}`} row={r} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function DirectoryRow({ row }: { row: Entry }) {
  const tel = telLink(row.phone);
  const wa = waLink(row.phone);
  const detailPath =
    row.kind === "customer"
      ? `/customer/${encodeURIComponent(row.name)}`
      : `/dealer/${encodeURIComponent(row.name)}`;

  return (
    <li className="flex items-center gap-[14px] border-b border-hairline py-3.5">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-[13px] font-extrabold text-muted-foreground">
        {initials(row.name)}
      </span>
      <Link to={detailPath} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[15px] font-bold">{row.name}</span>
          <span
            className={
              row.kind === "dealer"
                ? "shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary"
                : "shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground"
            }
          >
            {KIND_LABEL[row.kind]}
          </span>
        </div>
        <div className="tabular mt-[3px] truncate text-[12px] text-muted-foreground">
          {row.phone ?? <span className="text-faint">No number saved</span>}
          {row.orders > 0 && ` · ${row.orders} order${row.orders === 1 ? "" : "s"}`}
          {row.tags.length > 0 && ` · ${row.tags.slice(0, 2).join(", ")}`}
        </div>
      </Link>
      {tel && (
        <a
          href={tel}
          title="Call"
          aria-label={`Call ${row.name}`}
          className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition hover:border-foreground hover:text-foreground"
        >
          <Phone className="size-4" strokeWidth={2.2} />
        </a>
      )}
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          title="WhatsApp"
          aria-label={`WhatsApp ${row.name}`}
          className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-whatsapp transition hover:border-whatsapp hover:bg-whatsapp/10"
        >
          <WhatsAppIcon className="size-[18px]" />
        </a>
      )}
    </li>
  );
}
