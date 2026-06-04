import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { SaleDialog } from "@/components/SaleDialog";
import { SalesList } from "@/components/SalesList";
import { Input } from "@/components/ui/input";
import { useSales } from "@/hooks/use-sales";
import { isExpired, type Sale } from "@/lib/sale-utils";

export const Route = createFileRoute("/archive")({
  head: () => ({
    meta: [
      { title: "Archive — SubTracker" },
      { name: "description", content: "Expired subscription sales." },
    ],
  }),
  component: ArchivePage,
});

function ArchivePage() {
  const { data: sales = [], isLoading } = useSales();
  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);

  const expired = useMemo(() => {
    const term = q.trim().toLowerCase();
    return sales
      .filter((s: Sale) => isExpired(s))
      .filter(
        (s: Sale) =>
          !term ||
          s.productName.toLowerCase().includes(term) ||
          s.customerName.toLowerCase().includes(term),
      );
  }, [sales, q]);

  return (
    <AppLayout>
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Archive</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Sales whose warranty period has ended
        </p>
      </div>
      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-11 rounded-xl border-border/70 bg-card pl-9 shadow-[var(--shadow-soft)]"
          placeholder="Search archive"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="mt-5">
        <SalesList
          sales={expired}
          emptyText={isLoading ? "Loading…" : "Nothing archived yet."}
          onRowClick={(s) => { setEditing(s); setDialogOpen(true); }}
        />
      </div>
      <SaleDialog open={dialogOpen} onOpenChange={setDialogOpen} sale={editing} />
    </AppLayout>
  );
}