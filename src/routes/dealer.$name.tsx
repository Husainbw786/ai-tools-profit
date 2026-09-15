import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, MessageCircle, Phone } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { SalesList } from "@/components/SalesList";
import { SaleDialog } from "@/components/SaleDialog";
import { ContactEditor } from "@/components/ContactEditor";
import { Card } from "@/components/ui/card";
import { useSales } from "@/hooks/use-sales";
import { formatMoney, formatPct, type Sale } from "@/lib/sale-utils";
import { summarizeSales } from "@/lib/insights-utils";

export const Route = createFileRoute("/dealer/$name")({
  head: ({ params }) => ({
    meta: [{ title: `${decodeURIComponent(params.name)} — ProfitAI` }],
  }),
  component: DealerPage,
});

function DealerPage() {
  const { name } = Route.useParams();
  const decoded = decodeURIComponent(name);
  const { data: sales = [] } = useSales();
  const [editing, setEditing] = useState<Sale | null>(null);

  const dealerSales = useMemo(
    () =>
      sales.filter(
        (s) => s.buyerName.trim().toLowerCase() === decoded.trim().toLowerCase(),
      ),
    [sales, decoded],
  );

  const totals = useMemo(() => summarizeSales(dealerSales), [dealerSales]);

  const phone = dealerSales.find((s) => s.dealerNumber)?.dealerNumber ?? "";

  return (
    <AppLayout>
      <Link
        to="/dealers"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back
      </Link>

      <div className="mt-3">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Dealer
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{decoded}</h1>
        {phone && (
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <a href={`tel:${phone}`} className="inline-flex items-center gap-1 hover:text-foreground">
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
            Sourced
          </div>
          <div className="mt-1 font-display text-lg font-semibold tracking-tight">
            {dealerSales.length}
          </div>
        </Card>
        <Card className="border-border/70 bg-card p-3 shadow-[var(--shadow-soft)]">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Cost paid
          </div>
          <div className="mt-1 font-display text-lg font-semibold tracking-tight">
            {formatMoney(totals.cost)}
          </div>
        </Card>
        <Card className="border-border/70 bg-card p-3 shadow-[var(--shadow-soft)]">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Profit earned
          </div>
          <div className="mt-1 font-display text-lg font-semibold tracking-tight text-success">
            {formatMoney(totals.profit)}
          </div>
        </Card>
        <Card className="border-border/70 bg-card p-3 shadow-[var(--shadow-soft)]">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Margin
          </div>
          <div className="mt-1 font-display text-lg font-semibold tracking-tight">
            {formatPct(totals.marginPct)}
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <ContactEditor kind="dealer" name={decoded} />
      </div>

      <h2 className="mt-6 font-display text-lg font-semibold tracking-tight">
        Sourced products
      </h2>
      <div className="mt-3">
        <SalesList
          sales={dealerSales}
          emptyText="No sales sourced from this dealer."
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