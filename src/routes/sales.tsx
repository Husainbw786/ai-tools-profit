import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { SaleSheet } from "@/components/SaleSheet";
import { SalesList } from "@/components/SalesList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useSales } from "@/hooks/use-sales";
import { isExpired, type Sale } from "@/lib/sale-utils";

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
const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "paid", label: "Paid" },
  { id: "partial", label: "Partial" },
  { id: "unpaid", label: "Unpaid" },
];

function SalesPage() {
  const { data: sales = [], isLoading } = useSales();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);

  const activeAll = useMemo(
    () => sales.filter((s: Sale) => !isExpired(s)),
    [sales],
  );
  const active = useMemo(() => {
    const term = q.trim().toLowerCase();
    return activeAll
      .filter((s: Sale) => status === "all" || s.paymentStatus === status)
      .filter(
        (s: Sale) =>
          !term ||
          s.productName.toLowerCase().includes(term) ||
          s.customerName.toLowerCase().includes(term),
      );
  }, [activeAll, q, status]);

  return (
    <AppLayout>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Active sales
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {activeAll.length} subscription{activeAll.length === 1 ? "" : "s"} under warranty
          </p>
        </div>
        <Button
          size="sm"
          className="rounded-full px-4 shadow-[var(--shadow-soft)]"
          onClick={() => { setEditing(null); setDialogOpen(true); }}
        >
          <Plus className="size-4" /> Add
        </Button>
      </div>
      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-11 rounded-2xl border-border/70 bg-card pl-9 shadow-[var(--shadow-soft)]"
          placeholder="Search product or customer…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="mt-4 inline-flex w-full items-center gap-1 rounded-full border border-border/70 bg-card p-1 shadow-[var(--shadow-soft)]">
        {STATUS_TABS.map((t) => {
          const isActive = status === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setStatus(t.id)}
              className={cn(
                "flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                isActive
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="mt-5">
        <SalesList
          sales={active}
          emptyText={isLoading ? "Loading…" : "No active sales."}
          onRowClick={(s) => { setEditing(s); setDialogOpen(true); }}
        />
      </div>
      <SaleSheet open={dialogOpen} onOpenChange={setDialogOpen} sale={editing} />
    </AppLayout>
  );
}