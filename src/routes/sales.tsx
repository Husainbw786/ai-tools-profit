import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Plus } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PeriodPopover } from "@/components/PeriodPopover";
import { SaleSheet } from "@/components/SaleSheet";
import { SalesList } from "@/components/SalesList";
import { SalesGroups, type GroupBy } from "@/components/SalesGroups";
import { PageTitle, Pill, SegmentedPill, TextTabs, UnderlineSearch } from "@/components/primitives";
import { SkeletonRows } from "@/components/skeletons";
import { useSales } from "@/hooks/use-sales";
import { openNewSale } from "@/lib/new-sale-bus";
import { balanceDue, formatMoney, isExpired, isRefunded, type Sale } from "@/lib/sale-utils";

export const Route = createFileRoute("/sales")({
  head: () => ({
    meta: [
      { title: "Active Sales — ProfitAI" },
      { name: "description", content: "Sales currently under warranty." },
    ],
  }),
  component: SalesPage,
});

type StatusFilter = "all" | "paid" | "partial" | "unpaid";

type Grouping = "none" | GroupBy;

const GROUPINGS: { id: Grouping; label: string }[] = [
  { id: "none", label: "List" },
  { id: "customer", label: "By customer" },
  { id: "dealer", label: "By dealer" },
];

const monthKey = (s: Sale) => format(parseISO(s.warrantyStart), "yyyy-MM");

function SalesPage() {
  const { data: sales = [], isPending } = useSales();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [grouping, setGrouping] = useState<Grouping>("none");
  const [month, setMonth] = useState<string>("all");
  const [editing, setEditing] = useState<Sale | null>(null);

  const activeEvery = useMemo(() => sales.filter((s: Sale) => !isExpired(s)), [sales]);
  // Months (by start date) that still have an active sale, newest first.
  const months = useMemo(() => {
    const keys = [...new Set(activeEvery.map(monthKey))].sort().reverse();
    return [
      { id: "all", label: "All months" },
      ...keys.map((k) => ({ id: k, label: format(parseISO(`${k}-01`), "MMM yyyy") })),
    ];
  }, [activeEvery]);
  // A picked month can vanish once its last sale expires; fall back to all.
  const monthValue = months.some((m) => m.id === month) ? month : "all";
  const activeAll = useMemo(
    () =>
      monthValue === "all" ? activeEvery : activeEvery.filter((s) => monthKey(s) === monthValue),
    [activeEvery, monthValue],
  );
  const owed = useMemo(
    () => activeAll.reduce((a, s) => a + (isRefunded(s) ? 0 : balanceDue(s)), 0),
    [activeAll],
  );
  const active = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (
      activeAll
        .filter((s) => status === "all" || s.paymentStatus === status)
        .filter(
          (s) =>
            !term ||
            s.productName.toLowerCase().includes(term) ||
            s.customerName.toLowerCase().includes(term) ||
            s.buyerName.toLowerCase().includes(term),
        )
        // Latest sale date first; same-day sales by when they were entered.
        .sort(
          (a, b) =>
            Date.parse(b.warrantyStart) - Date.parse(a.warrantyStart) ||
            Date.parse(b.createdAt) - Date.parse(a.createdAt),
        )
    );
  }, [activeAll, q, status]);

  const tabs: { id: StatusFilter; label: React.ReactNode }[] = [
    { id: "all", label: `All ${activeAll.length}` },
    { id: "paid", label: "Paid" },
    { id: "partial", label: "Partial" },
    { id: "unpaid", label: "Unpaid" },
  ];

  return (
    <AppLayout>
      <PageTitle
        className="mt-7"
        title="Active"
        sub={
          <>
            {activeAll.length} subscription{activeAll.length === 1 ? "" : "s"} ·{" "}
            <span className="font-semibold text-foreground">{formatMoney(owed)} owed</span>
          </>
        }
        right={
          <Pill onClick={() => openNewSale()} className="py-[9px] text-[13px]">
            <Plus className="size-3.5" strokeWidth={2.6} /> Add
          </Pill>
        }
      />

      <UnderlineSearch
        className="mt-[22px]"
        value={q}
        onChange={setQ}
        placeholder="Search product, customer or dealer"
      />

      <SegmentedPill
        grow
        className="mt-4"
        options={GROUPINGS}
        value={grouping}
        onChange={setGrouping}
      />

      <div className="mt-[18px] flex items-start justify-between gap-3">
        <TextTabs tabs={tabs} value={status} onChange={setStatus} />
        <PeriodPopover
          options={months}
          value={monthValue}
          onChange={setMonth}
          className="-mt-1.5 shrink-0 px-3 py-1.5 text-[12px] font-bold"
        />
      </div>

      {isPending ? (
        <SkeletonRows count={6} />
      ) : grouping === "none" ? (
        <SalesList
          sales={active}
          emptyText="No active sales match."
          onRowClick={(s) => setEditing(s)}
        />
      ) : (
        <SalesGroups sales={active} groupBy={grouping} onRowClick={(s) => setEditing(s)} />
      )}

      <SaleSheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)} sale={editing} />
    </AppLayout>
  );
}
