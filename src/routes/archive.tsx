import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { SaleSheet } from "@/components/SaleSheet";
import { SalesList } from "@/components/SalesList";
import { BackLink, PageTitle, UnderlineSearch } from "@/components/primitives";
import { useSales } from "@/hooks/use-sales";
import { isExpired, warrantyEnd, type Sale } from "@/lib/sale-utils";

export const Route = createFileRoute("/archive")({
  head: () => ({
    meta: [
      { title: "Archive — ProfitAI" },
      { name: "description", content: "Expired subscription sales." },
    ],
  }),
  component: ArchivePage,
});

function ArchivePage() {
  const { data: sales = [], isLoading } = useSales();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Sale | null>(null);

  const expiredAll = useMemo(() => sales.filter((s) => isExpired(s)), [sales]);
  const expired = useMemo(() => {
    const term = q.trim().toLowerCase();
    return expiredAll
      .filter(
        (s) =>
          !term ||
          s.productName.toLowerCase().includes(term) ||
          s.customerName.toLowerCase().includes(term),
      )
      .sort((a, b) => warrantyEnd(b).getTime() - warrantyEnd(a).getTime());
  }, [expiredAll, q]);

  return (
    <AppLayout>
      <BackLink to="/more" className="mt-6" />
      <PageTitle
        className="mt-4"
        title="Archive"
        sub={`${expiredAll.length} sale${expiredAll.length === 1 ? "" : "s"} whose warranty has ended`}
      />

      <UnderlineSearch
        className="mt-[22px]"
        value={q}
        onChange={setQ}
        placeholder="Search archive"
      />

      <div className="mt-1.5">
        <SalesList
          sales={expired}
          emptyText={isLoading ? "Loading…" : "Nothing archived yet."}
          onRowClick={(s) => setEditing(s)}
        />
      </div>

      <SaleSheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)} sale={editing} />
    </AppLayout>
  );
}
