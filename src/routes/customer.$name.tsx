import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, MessageCircle, Phone } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { SalesList } from "@/components/SalesList";
import { SaleDialog } from "@/components/SaleDialog";
import { Card } from "@/components/ui/card";
import { useSales } from "@/hooks/use-sales";
import {
  formatMoney,
  formatPct,
  marginPct,
  profit,
  type Sale,
} from "@/lib/sale-utils";

export const Route = createFileRoute("/customer/$name")({
  head: ({ params }) => ({
    meta: [{ title: `${decodeURIComponent(params.name)} — ProfitAI` }],
  }),
  component: CustomerPage,
});

function CustomerPage() {
  const { name } = Route.useParams();
  const decoded = decodeURIComponent(name);
  const { data: sales = [] } = useSales();
  const [editing, setEditing] = useState<Sale | null>(null);

  const customerSales = useMemo(
    () =>
      sales.filter(
        (s) => s.customerName.trim().toLowerCase() === decoded.trim().toLowerCase(),
      ),
    [sales, decoded],
  );

  const totals = useMemo(() => {
    const revenue = customerSales.reduce((a, s) => a + s.sellPrice, 0);
    const cost = customerSales.reduce((a, s) => a + s.buyPrice, 0);
    const totalProfit = customerSales.reduce((a, s) => a + profit(s), 0);
    const avgMargin =
      customerSales.length > 0
        ? customerSales.reduce((a, s) => a + marginPct(s), 0) / customerSales.length
        : 0;
    const unpaid = customerSales.filter((s) => s.paymentStatus !== "paid").length;
    return { revenue, cost, totalProfit, avgMargin, unpaid };
  }, [customerSales]);

  const phone = customerSales.find((s) => s.customerNumber)?.customerNumber ?? "";

  return (
    <AppLayout>
      <Link
        to="/sales"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back
      </Link>

      <div className="mt-3">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Customer
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{decoded}</h1>
        {phone && (
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <Phone className="size-3" /> {phone}
            </a>
            <a
              href={`https://wa.me/${phone.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-success hover:underline"
            >
              <MessageCircle className="size-3" /> WhatsApp
            </a>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Card className="border-border/70 bg-card p-3 shadow-[var(--shadow-soft)]">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Orders
          </div>
          <div className="mt-1 font-display text-lg font-semibold tracking-tight">
            {customerSales.length}
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
            Total profit
          </div>
          <div className="mt-1 font-display text-lg font-semibold tracking-tight text-success">
            {formatMoney(totals.totalProfit)}
          </div>
        </Card>
        <Card className="border-border/70 bg-card p-3 shadow-[var(--shadow-soft)]">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Avg margin
          </div>
          <div className="mt-1 font-display text-lg font-semibold tracking-tight">
            {formatPct(totals.avgMargin)}
          </div>
        </Card>
      </div>

      {totals.unpaid > 0 && (
        <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {totals.unpaid} sale{totals.unpaid === 1 ? "" : "s"} pending payment
        </div>
      )}

      <h2 className="mt-6 font-display text-lg font-semibold tracking-tight">
        Purchase history
      </h2>
      <div className="mt-3">
        <SalesList
          sales={customerSales}
          emptyText="No sales for this customer."
          onRowClick={(s) => setEditing(s)}
        />
      </div>

      <SaleDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        sale={editing}
      />
    </AppLayout>
  );
}