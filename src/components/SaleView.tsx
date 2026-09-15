import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaymentsSection } from "@/components/PaymentsSection";
import { Stat, StatGrid, StatusDot } from "@/components/primitives";
import { useDeleteSale, useUpdateSale } from "@/hooks/use-sales";
import { cn } from "@/lib/utils";
import {
  balanceDue,
  daysRemaining,
  formatDate,
  formatMoney,
  isExpired,
  isRefunded,
  lineCost,
  lineTotal,
  profit,
  statusDotClass,
  statusLabel,
  statusTagClass,
  warrantyEnd,
  whatsAppUrl,
  type Sale,
} from "@/lib/sale-utils";

export function SaleView({
  sale,
  onEdit,
  onClose,
}: {
  sale: Sale;
  onEdit: () => void;
  onClose: () => void;
}) {
  const due = balanceDue(sale);
  const refunded = isRefunded(sale);
  const expired = isExpired(sale);
  const updateMut = useUpdateSale();
  const deleteMut = useDeleteSale();
  const [showRefund, setShowRefund] = useState(false);
  const [refundAmt, setRefundAmt] = useState<number>(lineTotal(sale));
  const [refundReason, setRefundReason] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const submitRefund = async () => {
    try {
      await updateMut.mutateAsync({
        id: sale.id,
        patch: {
          refundedAt: new Date().toISOString(),
          refundAmount: Math.max(0, Math.min(refundAmt, lineTotal(sale))),
          refundReason: refundReason.trim() || null,
        },
      });
      toast.success("Refund recorded");
      setShowRefund(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const undoRefund = async () => {
    try {
      await updateMut.mutateAsync({
        id: sale.id,
        patch: { refundedAt: null, refundAmount: null, refundReason: null },
      });
      toast.success("Refund removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const remove = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await deleteMut.mutateAsync(sale.id);
      toast.success("Sale deleted");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const left = !sale.hasWarranty
    ? "No warranty"
    : expired
      ? `Expired ${formatDate(warrantyEnd(sale))}`
      : `${daysRemaining(sale)} days of warranty left`;

  return (
    <div className="pb-2">
      <div className="mt-[22px] flex items-center gap-2.5">
        <StatusDot className={statusDotClass(sale)} />
        <span
          className={cn(
            "rounded-full px-[9px] py-[3px] text-[11px] font-bold uppercase tracking-[0.04em]",
            statusTagClass(sale),
          )}
        >
          {statusLabel(sale)}
        </span>
        <span className="text-[12px] text-muted-foreground">{left}</span>
      </div>

      <StatGrid cols={3} className="mt-[18px] py-4">
        <Stat label="Sell" value={formatMoney(lineTotal(sale))} />
        <Stat label="Buy" value={formatMoney(lineCost(sale))} />
        <Stat label="Profit" value={formatMoney(profit(sale))} valueClassName="text-accent-text" />
      </StatGrid>

      {(refunded || due > 0) && (
        <div className="mt-3.5 rounded-[12px] bg-destructive-soft px-3.5 py-2.5 text-center text-[13px] font-bold text-destructive">
          {refunded
            ? `Refunded · ${formatMoney(sale.refundAmount ?? lineTotal(sale))} returned${
                sale.refundReason ? ` · ${sale.refundReason}` : ""
              }${sale.refundedAt ? ` · ${formatDate(sale.refundedAt)}` : ""}`
            : `${formatMoney(due)} due`}
        </div>
      )}

      <div className="mt-1.5 grid grid-cols-2 gap-x-[18px] text-[13px]">
        <Detail label="Dealer" value={sale.buyerName || "—"} meta={sale.dealerNumber} />
        <Detail label="Customer" value={sale.customerName || "—"} meta={sale.customerNumber} />
        <Detail label="Warranty start" value={formatDate(sale.warrantyStart)} />
        <Detail label="Warranty end" value={formatDate(warrantyEnd(sale))} />
      </div>

      {sale.notes && (
        <div className="border-b border-hairline py-3">
          <div className="text-[11px] font-semibold text-muted-foreground">Notes</div>
          <div className="mt-0.5 whitespace-pre-wrap text-[13px]">{sale.notes}</div>
        </div>
      )}

      <PaymentsSection sale={sale} />

      {showRefund && !refunded && (
        <div className="mt-5 border-t border-border pt-3.5">
          <Label>Refund this sale</Label>
          <div className="mt-1.5 flex gap-2">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={refundAmt === 0 ? "" : String(refundAmt)}
              placeholder="Refund amount"
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                setRefundAmt(v === "" ? 0 : Number(v));
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="h-[46px] rounded-[12px] px-4 text-[13px]"
              onClick={() => setRefundAmt(lineTotal(sale))}
            >
              Full
            </Button>
          </div>
          <Input
            className="mt-2"
            placeholder="Reason (optional)"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
          />
          <p className="mt-1.5 text-[11px] text-faint">
            Profit will drop to {formatMoney(lineTotal(sale) - refundAmt - lineCost(sale))}.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="destructive"
              className="h-12 flex-1 text-[14px]"
              onClick={submitRefund}
              disabled={updateMut.isPending}
            >
              {updateMut.isPending ? "Saving…" : "Mark refunded"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12 px-5 text-[14px]"
              onClick={() => setShowRefund(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="mt-[26px] flex gap-2">
        <Button asChild variant="outline" className="h-12 flex-1 rounded-[14px] text-[14px]">
          <a href={whatsAppUrl(sale)} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
        </Button>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-12 flex-1 rounded-[14px] text-[14px]",
            !refunded && "text-destructive hover:text-destructive",
          )}
          disabled={updateMut.isPending}
          onClick={() => {
            if (refunded) undoRefund();
            else {
              setRefundAmt(lineTotal(sale));
              setShowRefund((v) => !v);
            }
          }}
        >
          {refunded ? "Undo refund" : "Refund"}
        </Button>
        <Button type="button" className="h-12 flex-1 rounded-[14px] text-[14px]" onClick={onEdit}>
          Edit
        </Button>
      </div>

      <button
        type="button"
        onClick={remove}
        disabled={deleteMut.isPending}
        className="mt-[18px] w-full text-center text-[13px] font-bold text-destructive transition hover:opacity-80 disabled:opacity-50"
      >
        {deleteMut.isPending
          ? "Deleting…"
          : confirmDelete
            ? "Tap again to delete permanently"
            : "Delete sale"}
      </button>
    </div>
  );
}

function Detail({ label, value, meta }: { label: string; value: string; meta?: string | null }) {
  return (
    <div className="min-w-0 border-b border-hairline py-3">
      <div className="text-[11px] font-semibold text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate font-semibold">{value}</div>
      {meta && <div className="truncate text-[11px] text-faint">{meta}</div>}
    </div>
  );
}
