import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { SalesList } from "@/components/SalesList";
import { SaleSheet } from "@/components/SaleSheet";
import { ContactEditor } from "@/components/ContactEditor";
import { BackLink, Kicker, QuadStat } from "@/components/primitives";
import { useSales } from "@/hooks/use-sales";
import { telLink, waLink, type ContactKind } from "@/lib/contacts-utils";
import {
  balanceDue,
  effectiveRevenue,
  formatMoney,
  formatPct,
  isRefunded,
  marginPct,
  profit,
  type Sale,
} from "@/lib/sale-utils";

/** Shared body for /customer/$name and /dealer/$name. */
export function ContactDetail({ kind, name }: { kind: ContactKind; name: string }) {
  const { data: sales = [] } = useSales();
  const [editing, setEditing] = useState<Sale | null>(null);

  const rows = useMemo(() => {
    const key = name.trim().toLowerCase();
    const nameOf = (s: Sale) => (kind === "customer" ? s.customerName : s.buyerName);
    return sales
      .filter((s) => nameOf(s).trim().toLowerCase() === key)
      .sort((a, b) => b.warrantyStart.localeCompare(a.warrantyStart));
  }, [sales, kind, name]);

  const totals = useMemo(() => {
    const revenue = rows.reduce((a, s) => a + effectiveRevenue(s), 0);
    const totalProfit = rows.reduce((a, s) => a + profit(s), 0);
    const avgMargin =
      rows.length > 0 ? rows.reduce((a, s) => a + marginPct(s), 0) / rows.length : 0;
    const pending = rows.filter((s) => !isRefunded(s) && balanceDue(s) > 0);
    const dues = pending.reduce((a, s) => a + balanceDue(s), 0);
    return { revenue, totalProfit, avgMargin, pendingCount: pending.length, dues };
  }, [rows]);

  const phone =
    rows.find((s) => (kind === "customer" ? s.customerNumber : s.dealerNumber))?.[
      kind === "customer" ? "customerNumber" : "dealerNumber"
    ] ?? "";
  const tel = telLink(phone);
  const wa = waLink(phone);
  const listLabel = kind === "customer" ? "Customers" : "Dealers";

  return (
    <AppLayout>
      <BackLink
        to={kind === "customer" ? "/customers" : "/dealers"}
        label={listLabel}
        className="mt-6"
      />
      <Kicker className="mt-[18px]">{kind === "customer" ? "CUSTOMER" : "DEALER"}</Kicker>
      <h1 className="text-title mt-1.5 leading-[1.05]">{name}</h1>
      <div className="mt-3 flex flex-wrap gap-3.5 text-[13px] font-semibold text-muted-foreground">
        {tel ? (
          <a href={tel} className="transition hover:text-foreground">
            {phone}
          </a>
        ) : (
          <span>No number</span>
        )}
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-text transition hover:underline"
          >
            WhatsApp →
          </a>
        )}
      </div>

      <div className="tabular mt-[26px] grid grid-cols-2 border-y border-border md:grid-cols-4">
        <QuadStat index={0} label="Orders" value={rows.length} />
        <QuadStat index={1} label="Revenue" value={formatMoney(totals.revenue)} />
        <QuadStat
          index={2}
          label="Total profit"
          value={formatMoney(totals.totalProfit)}
          valueClassName="text-accent-text"
        />
        <QuadStat index={3} label="Avg margin" value={formatPct(totals.avgMargin)} />
      </div>

      {totals.pendingCount > 0 && (
        <div className="mt-3.5 rounded-[12px] bg-destructive-soft px-3.5 py-2.5 text-[13px] font-bold text-destructive">
          {totals.pendingCount} sale{totals.pendingCount === 1 ? "" : "s"} pending payment ·{" "}
          {formatMoney(totals.dues)}
        </div>
      )}

      <ContactEditor kind={kind} name={name} />

      <h2 className="text-section mt-7">Purchase history</h2>
      <SalesList
        sales={rows}
        partyOf={kind === "customer" ? "dealer" : "customer"}
        emptyText={
          kind === "customer" ? "No sales for this customer." : "No sales sourced from this dealer."
        }
        onRowClick={(s) => setEditing(s)}
      />

      <SaleSheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)} sale={editing} />
    </AppLayout>
  );
}
