import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { SaleSheet } from "@/components/SaleSheet";
import { SalesList } from "@/components/SalesList";
import { PageTitle, Pill, TextTabs, UnderlineSearch } from "@/components/primitives";
import { useSales } from "@/hooks/use-sales";
import { openNewSale } from "@/lib/new-sale-bus";
import {
  balanceDue,
  daysRemaining,
  formatMoney,
  isExpired,
  isRefunded,
  type Sale,
} from "@/lib/sale-utils";

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

function SalesPage() {
  const { data: sales = [], isLoading } = useSales();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [editing, setEditing] = useState<Sale | null>(null);

  const activeAll = useMemo(() => sales.filter((s: Sale) => !isExpired(s)), [sales]);
  const owed = useMemo(
    () => activeAll.reduce((a, s) => a + (isRefunded(s) ? 0 : balanceDue(s)), 0),
    [activeAll],
  );
  const active = useMemo(() => {
    const term = q.trim().toLowerCase();
    return activeAll
      .filter((s) => status === "all" || s.paymentStatus === status)
      .filter(
        (s) =>
          !term ||
          s.productName.toLowerCase().includes(term) ||
          s.customerName.toLowerCase().includes(term),
      )
      .sort((a, b) => daysRemaining(a) - daysRemaining(b));
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
        placeholder="Search product or customer"
      />

      <TextTabs className="mt-5" tabs={tabs} value={status} onChange={setStatus} />

      <SalesList
        sales={active}
        emptyText={isLoading ? "Loading…" : "No active sales match."}
        onRowClick={(s) => setEditing(s)}
      />

      <SaleSheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)} sale={editing} />
    </AppLayout>
  );
}
