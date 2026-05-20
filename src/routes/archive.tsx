import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { SaleDialog } from "@/components/SaleDialog";
import { SalesList } from "@/components/SalesList";
import { Input } from "@/components/ui/input";
import { useSales } from "@/lib/sales-store";
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
  const sales = useSales();
  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);

  const expired = useMemo(() => {
    const term = q.trim().toLowerCase();
    return sales
      .filter((s) => isExpired(s))
      .filter(
        (s) =>
          !term ||
          s.productName.toLowerCase().includes(term) ||
          s.customerName.toLowerCase().includes(term),
      );
  }, [sales, q]);

  return (
    <AppLayout>
      <div>
        <h1 className="text-xl font-semibold">Archive</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sales whose warranty period has ended.
        </p>
      </div>
      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search archive"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="mt-4">
        <SalesList
          sales={expired}
          emptyText="Nothing archived yet."
          onRowClick={(s) => { setEditing(s); setDialogOpen(true); }}
        />
      </div>
      <SaleDialog open={dialogOpen} onOpenChange={setDialogOpen} sale={editing} />
    </AppLayout>
  );
}