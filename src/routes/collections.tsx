import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { differenceInCalendarDays } from "date-fns";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { AppLayout } from "@/components/AppLayout";
import { SaleSheet } from "@/components/SaleSheet";
import { BackLink, EmptyState, PageTitle } from "@/components/primitives";
import { Bone, SkeletonRows } from "@/components/skeletons";
import { cn } from "@/lib/utils";
import { useSales } from "@/hooks/use-sales";
import {
  balanceDue,
  formatMoney,
  isRefunded,
  lineTotal,
  reminderWhatsAppUrl,
  type Sale,
} from "@/lib/sale-utils";

export const Route = createFileRoute("/collections")({
  head: () => ({
    meta: [
      { title: "Dues — ProfitAI" },
      { name: "description", content: "All sales with pending dues." },
    ],
  }),
  component: CollectionsPage,
});

function CollectionsPage() {
  const { data: sales = [], isPending } = useSales();
  const [editing, setEditing] = useState<Sale | null>(null);

  const unpaid = useMemo(
    () =>
      sales
        .filter((s) => balanceDue(s) > 0 && !isRefunded(s))
        .sort((a, b) => new Date(a.warrantyStart).getTime() - new Date(b.warrantyStart).getTime()),
    [sales],
  );

  const totalDue = unpaid.reduce((acc, s) => acc + balanceDue(s), 0);
  const totalBilled = unpaid.reduce((acc, s) => acc + lineTotal(s), 0);
  const now = new Date();

  return (
    <AppLayout>
      <BackLink to="/" className="mt-6" />
      <PageTitle className="mt-4" title="Dues" sub="Pending payments, oldest first" />

      <div className="mt-[34px] text-[13px] font-semibold text-muted-foreground">
        Total outstanding
      </div>
      {isPending ? (
        <Bone className="mt-2 h-[54px] w-[200px] rounded-[12px]" />
      ) : (
        <div className="text-hero mt-2 text-destructive">{formatMoney(totalDue)}</div>
      )}
      <div className="mt-2.5 text-[13px] text-muted-foreground">
        {isPending
          ? "Checking pending payments…"
          : `across ${unpaid.length} sale${unpaid.length === 1 ? "" : "s"} · ${formatMoney(totalBilled)} billed`}
      </div>

      <ul className="mt-7 border-t border-border">
        {isPending ? (
          <SkeletonRows count={3} />
        ) : unpaid.length === 0 ? (
          <EmptyState>Nothing outstanding. You&apos;re all paid up.</EmptyState>
        ) : (
          unpaid.map((s) => {
            const due = balanceDue(s);
            const ageDays = differenceInCalendarDays(now, new Date(s.warrantyStart));
            return (
              <li key={s.id} className="border-b border-hairline py-[18px]">
                <button
                  type="button"
                  onClick={() => setEditing(s)}
                  className="flex w-full items-start justify-between gap-3 text-left"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-bold">
                      {s.productName}
                      {s.quantity > 1 ? ` ×${s.quantity}` : ""}
                    </div>
                    <div className="mt-[3px] truncate text-[12px] text-muted-foreground">
                      {s.customerName || "—"}
                      {s.customerNumber ? ` · ${s.customerNumber}` : ""}
                    </div>
                  </div>
                  <div className="tabular shrink-0 text-right">
                    <div className="text-[17px] font-bold text-destructive">{formatMoney(due)}</div>
                    <div className="mt-0.5 text-[11px] text-faint">
                      of {formatMoney(lineTotal(s))}
                    </div>
                  </div>
                </button>
                <div className="mt-3 flex items-center justify-between">
                  <span
                    className={cn(
                      "text-[12px] font-bold",
                      ageDays > 30 ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {ageDays} day{ageDays === 1 ? "" : "s"} old
                  </span>
                  <a
                    href={reminderWhatsAppUrl(s)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-[7px] text-[12px] font-bold text-white transition hover:bg-primary/90"
                  >
                    <WhatsAppIcon className="size-[14px]" />
                    Send reminder
                  </a>
                </div>
              </li>
            );
          })
        )}
      </ul>

      <SaleSheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)} sale={editing} />
    </AppLayout>
  );
}
