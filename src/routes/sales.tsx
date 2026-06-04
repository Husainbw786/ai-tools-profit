import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, RefreshCw } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { SaleDialog } from "@/components/SaleDialog";
import { SalesList } from "@/components/SalesList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSales } from "@/hooks/use-sales";
import { backfillSalesToSheet, isAdmin } from "@/lib/sales.functions";
import { isExpired, type Sale } from "@/lib/sale-utils";

export const Route = createFileRoute("/sales")({
  head: () => ({
    meta: [
      { title: "Active Sales — SubTracker" },
      { name: "description", content: "Sales currently under warranty." },
    ],
  }),
  component: SalesPage,
});

function SalesPage() {
  const { data: sales = [], isLoading } = useSales();
  const [q, setQ] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);

  const isAdminFn = useServerFn(isAdmin);
  const backfillFn = useServerFn(backfillSalesToSheet);
  const { data: adminData } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => isAdminFn(),
    staleTime: 5 * 60_000,
  });
  const backfill = useMutation({
    mutationFn: () => backfillFn(),
    onSuccess: (r) =>
      toast.success(`Synced ${r.total} sales across ${r.users} user(s) to Google Sheet`),
    onError: (e: Error) => toast.error(e.message),
  });

  const active = useMemo(() => {
    const term = q.trim().toLowerCase();
    return sales
      .filter((s: Sale) => !isExpired(s))
      .filter(
        (s: Sale) =>
          !term ||
          s.productName.toLowerCase().includes(term) ||
          s.customerName.toLowerCase().includes(term),
      );
  }, [sales, q]);

  return (
    <AppLayout>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Active sales</h1>
        <div className="flex items-center gap-2">
          {adminData?.isAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => backfill.mutate()}
              disabled={backfill.isPending}
            >
              <RefreshCw className={`size-4 ${backfill.isPending ? "animate-spin" : ""}`} />
              {backfill.isPending ? "Syncing…" : "Sync to Sheet"}
            </Button>
          )}
          <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="size-4" /> Add
          </Button>
        </div>
      </div>
      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search product or customer"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="mt-4">
        <SalesList
          sales={active}
          emptyText={isLoading ? "Loading…" : "No active sales."}
          onRowClick={(s) => { setEditing(s); setDialogOpen(true); }}
        />
      </div>
      <SaleDialog open={dialogOpen} onOpenChange={setDialogOpen} sale={editing} />
    </AppLayout>
  );
}