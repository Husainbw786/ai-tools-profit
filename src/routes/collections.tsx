import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { differenceInCalendarDays } from "date-fns";
import { MessageCircle, Wallet, AlertCircle } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { SaleSheet } from "@/components/SaleSheet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSales } from "@/hooks/use-sales";
import {
  balanceDue,
  formatMoney,
  lineTotal,
  reminderWhatsAppUrl,
  type Sale,
} from "@/lib/sale-utils";

export const Route = createFileRoute("/collections")({
  head: () => ({
    meta: [
      { title: "Collections — ProfitAI" },
      { name: "description", content: "All sales with pending dues." },
    ],
  }),
  component: CollectionsPage,
});

function CollectionsPage() {
  const { data: sales = [], isLoading } = useSales();
  const [editing, setEditing] = useState<Sale | null>(null);

  const unpaid = useMemo(() => {
    return sales
      .filter((s) => balanceDue(s) > 0)
      .sort(
        (a, b) =>
          new Date(a.warrantyStart).getTime() - new Date(b.warrantyStart).getTime(),
      );
  }, [sales]);

  const totalDue = unpaid.reduce((acc, s) => acc + balanceDue(s), 0);
  const totalBilled = unpaid.reduce((acc, s) => acc + lineTotal(s), 0);

  return (
    <AppLayout>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Collections
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pending dues, oldest first
          </p>
        </div>
      </div>

      <Card
        className="mt-4 relative overflow-hidden border-0 p-6 text-primary-foreground shadow-[var(--shadow-elegant)]"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      >
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider">
          <Wallet className="size-3.5" />
          Total outstanding
        </div>
        <div className="mt-2 font-display text-4xl font-bold tracking-tight">
          {formatMoney(totalDue)}
        </div>
        <div className="mt-1 text-xs text-white/70">
          across {unpaid.length} sale{unpaid.length === 1 ? "" : "s"} ·{" "}
          {formatMoney(totalBilled)} billed
        </div>
      </Card>

      <div className="mt-5 space-y-2.5">
        {isLoading ? (
          <div className="py-14 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : unpaid.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card/50 py-14 text-center text-sm text-muted-foreground">
            Nothing outstanding. You're all paid up.
          </div>
        ) : (
          unpaid.map((s) => {
            const due = balanceDue(s);
            const ageDays = differenceInCalendarDays(
              new Date(),
              new Date(s.warrantyStart),
            );
            const isOld = ageDays > 30;
            return (
              <div
                key={s.id}
                className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-soft)]"
              >
                <button
                  type="button"
                  onClick={() => setEditing(s)}
                  className="block w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-display text-[15px] font-semibold tracking-tight">
                          {s.productName}
                        </span>
                        {s.quantity > 1 && (
                          <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            ×{s.quantity}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {s.customerName || "—"}
                        {s.customerNumber ? ` · ${s.customerNumber}` : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-lg font-bold tracking-tight text-destructive">
                        {formatMoney(due)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        of {formatMoney(lineTotal(s))}
                      </div>
                    </div>
                  </div>
                </button>
                <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5 text-[11px]">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 font-medium",
                      isOld ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {isOld && <AlertCircle className="size-3" />}
                    {ageDays}d old
                  </span>
                  <a
                    href={reminderWhatsAppUrl(s)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 font-medium text-success hover:bg-success/20"
                  >
                    <MessageCircle className="size-3" />
                    Send reminder
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>

      {editing && (
        <SaleSheet
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          sale={editing}
        />
      )}
    </AppLayout>
  );
}