import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, MessageCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useCreateSale, useDeleteSale, useSales, useUpdateSale } from "@/hooks/use-sales";
import {
  balanceDue,
  formatMoney,
  warrantyEnd,
  whatsAppUrl,
  type PaymentStatus,
  type Sale,
} from "@/lib/sale-utils";
import { PaymentsSection } from "@/components/PaymentsSection";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { createPayment } from "@/lib/payments.functions";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sale?: Sale | null;
};

type Item = {
  productName: string;
  durationMonths: number;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  hasWarranty: boolean;
};

const emptyItem = (): Item => ({
  productName: "",
  durationMonths: 1,
  quantity: 1,
  buyPrice: 0,
  sellPrice: 0,
  hasWarranty: true,
});

const emptyShared = () => ({
  buyerName: "",
  customerName: "",
  warrantyStart: new Date().toISOString(),
  notes: "",
  customerNumber: "",
  dealerNumber: "",
  paymentStatus: "paid" as PaymentStatus,
});

export function SaleDialog({ open, onOpenChange, sale }: Props) {
  const [shared, setShared] = useState(emptyShared());
  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [receivedTouched, setReceivedTouched] = useState(false);
  const createMut = useCreateSale();
  const updateMut = useUpdateSale();
  const deleteMut = useDeleteSale();
  const { data: allSales = [] } = useSales();
  const createPay = useServerFn(createPayment);
  const busy = createMut.isPending || updateMut.isPending || deleteMut.isPending;

  const uniq = (arr: (string | null | undefined)[]) =>
    Array.from(new Set(arr.map((v) => (v ?? "").trim()).filter(Boolean)));
  const productOpts = uniq(allSales.map((s) => s.productName));
  const buyerOpts = uniq(allSales.map((s) => s.buyerName));
  const customerOpts = uniq(allSales.map((s) => s.customerName));
  const dealerNumOpts = uniq(allSales.map((s) => s.dealerNumber));
  const customerNumOpts = uniq(allSales.map((s) => s.customerNumber));

  const findByCustomerName = (name: string) =>
    allSales.find(
      (s) =>
        s.customerName.trim().toLowerCase() === name.trim().toLowerCase() &&
        (s.customerNumber ?? "").trim() !== "",
    );
  const findByCustomerNumber = (num: string) =>
    allSales.find(
      (s) => (s.customerNumber ?? "").trim() === num.trim() && s.customerName.trim() !== "",
    );
  const findByBuyerName = (name: string) =>
    allSales.find(
      (s) =>
        s.buyerName.trim().toLowerCase() === name.trim().toLowerCase() &&
        (s.dealerNumber ?? "").trim() !== "",
    );
  const findByDealerNumber = (num: string) =>
    allSales.find(
      (s) => (s.dealerNumber ?? "").trim() === num.trim() && s.buyerName.trim() !== "",
    );

  useEffect(() => {
    if (!open) return;
    if (sale) {
      setMode("view");
      setShared({
        buyerName: sale.buyerName,
        customerName: sale.customerName,
        warrantyStart: sale.warrantyStart,
        notes: sale.notes ?? "",
        customerNumber: sale.customerNumber ?? "",
        dealerNumber: sale.dealerNumber ?? "",
        paymentStatus: sale.paymentStatus,
      });
      setItems([
        {
          productName: sale.productName,
          durationMonths: sale.durationMonths,
          quantity: sale.quantity ?? 1,
          buyPrice: sale.buyPrice,
          sellPrice: sale.sellPrice,
          hasWarranty: sale.hasWarranty,
        },
      ]);
    } else {
      setMode("edit");
      setShared(emptyShared());
      setItems([emptyItem()]);
      setAmountReceived(0);
      setReceivedTouched(false);
    }
  }, [open, sale]);

  const updateItem = (i: number, patch: Partial<Item>) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removeItem = (i: number) =>
    setItems((arr) => (arr.length <= 1 ? arr : arr.filter((_, idx) => idx !== i)));

  const totalRevenue = items.reduce(
    (s, it) => s + it.sellPrice * (it.quantity || 1),
    0,
  );
  const totalProfit = items.reduce(
    (s, it) => s + (it.sellPrice - it.buyPrice) * (it.quantity || 1),
    0,
  );

  // Auto-sync received amount with status / total when user hasn't manually edited it
  useEffect(() => {
    if (sale) return;
    if (receivedTouched && shared.paymentStatus === "partial") return;
    if (shared.paymentStatus === "paid") setAmountReceived(totalRevenue);
    else if (shared.paymentStatus === "unpaid") setAmountReceived(0);
    else if (shared.paymentStatus === "partial" && !receivedTouched)
      setAmountReceived(0);
  }, [shared.paymentStatus, totalRevenue, sale, receivedTouched]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some((it) => !it.productName.trim())) {
      toast.error("Each product needs a name");
      return;
    }
    try {
      if (sale) {
        const it = items[0];
        await updateMut.mutateAsync({
          id: sale.id,
          patch: {
            ...shared,
            productName: it.productName,
            durationMonths: it.durationMonths,
            quantity: it.quantity,
            buyPrice: it.buyPrice,
            sellPrice: it.sellPrice,
            hasWarranty: it.hasWarranty,
          },
        });
        toast.success("Sale updated");
      } else {
        const created = [] as { id: string; sellPrice: number }[];
        for (const it of items) {
          const row = await createMut.mutateAsync({
            ...shared,
            productName: it.productName,
            durationMonths: it.durationMonths,
            quantity: it.quantity,
            buyPrice: it.buyPrice,
            sellPrice: it.sellPrice,
            hasWarranty: it.hasWarranty,
          });
          if (row?.id) created.push({ id: row.id, sellPrice: it.sellPrice * (it.quantity || 1) });
        }
        // Record initial payment if any was received
        if (amountReceived > 0 && created.length > 0 && totalRevenue > 0) {
          let remaining = Math.min(amountReceived, totalRevenue);
          for (let i = 0; i < created.length; i++) {
            const c = created[i];
            const portion = i === created.length - 1
              ? remaining
              : Math.min(remaining, c.sellPrice);
            if (portion > 0) {
              await createPay({
                data: {
                  saleId: c.id,
                  amount: portion,
                  paidAt: new Date().toISOString(),
                  method: null,
                  note: null,
                },
              });
              remaining -= portion;
            }
          }
        }
        toast.success(items.length > 1 ? `${items.length} sales added` : "Sale added");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  const remove = async () => {
    if (!sale) return;
    try {
      await deleteMut.mutateAsync(sale.id);
      toast.success("Sale deleted");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {sale ? (mode === "view" ? "Sale details" : "Edit sale") : "Add sale"}
          </DialogTitle>
          <DialogDescription>
            {sale
              ? mode === "view"
                ? "Review this sale. Tap Edit to make changes."
                : "Update this sale."
              : "Record one or more products sold to the same customer."}
          </DialogDescription>
        </DialogHeader>
        {sale && mode === "view" ? (
          <SaleView
            sale={sale}
            onEdit={() => setMode("edit")}
            onClose={() => onOpenChange(false)}
          />
        ) : (
        <form onSubmit={submit} className="space-y-3">
          {items.map((it, idx) => (
            <div key={idx} className="space-y-3 rounded-md border bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Product {idx + 1}
                </span>
                {!sale && items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-destructive"
                    onClick={() => removeItem(idx)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Product</Label>
                <Input
                  list="opt-products"
                  placeholder="LinkedIn Premium Career"
                  value={it.productName}
                  onChange={(e) => updateItem(idx, { productName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Duration (months)</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={it.durationMonths === 0 ? "" : String(it.durationMonths)}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "");
                      updateItem(idx, { durationMonths: v === "" ? 0 : Number(v) });
                    }}
                    onBlur={() => {
                      if (!it.durationMonths || it.durationMonths < 1)
                        updateItem(idx, { durationMonths: 1 });
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Quantity</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={it.quantity === 0 ? "" : String(it.quantity)}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "");
                      updateItem(idx, { quantity: v === "" ? 0 : Number(v) });
                    }}
                    onBlur={() => {
                      if (!it.quantity || it.quantity < 1) updateItem(idx, { quantity: 1 });
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Buy price</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={it.buyPrice === 0 ? "" : String(it.buyPrice)}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "");
                      updateItem(idx, { buyPrice: v === "" ? 0 : Number(v) });
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Sell price</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={it.sellPrice === 0 ? "" : String(it.sellPrice)}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "");
                      updateItem(idx, { sellPrice: v === "" ? 0 : Number(v) });
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                <Label className="cursor-pointer text-sm">Under warranty</Label>
                <Switch
                  checked={it.hasWarranty}
                  onCheckedChange={(v) => updateItem(idx, { hasWarranty: v })}
                />
              </div>
            </div>
          ))}

          {!sale && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setItems((a) => [...a, emptyItem()])}
            >
              <Plus className="size-4" /> Add another product
            </Button>
          )}

          <div className="space-y-1.5">
            <Label>Warranty start</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal")}
                >
                  <CalendarIcon className="mr-2 size-4" />
                  {format(new Date(shared.warrantyStart), "PP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={new Date(shared.warrantyStart)}
                  onSelect={(d) =>
                    d && setShared({ ...shared, warrantyStart: d.toISOString() })
                  }
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="buyer">Buyer</Label>
              <Input
                id="buyer"
                list="opt-buyers"
                placeholder="Where you bought from"
                value={shared.buyerName}
                onChange={(e) => {
                  const v = e.target.value;
                  const match = findByBuyerName(v);
                  setShared((f) => ({
                    ...f,
                    buyerName: v,
                    dealerNumber: match ? match.dealerNumber ?? f.dealerNumber : f.dealerNumber,
                  }));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer">Customer</Label>
              <Input
                id="customer"
                list="opt-customers"
                placeholder="Who you sold to"
                value={shared.customerName}
                onChange={(e) => {
                  const v = e.target.value;
                  const match = findByCustomerName(v);
                  setShared((f) => ({
                    ...f,
                    customerName: v,
                    customerNumber: match
                      ? match.customerNumber ?? f.customerNumber
                      : f.customerNumber,
                  }));
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dealerNum">
                Dealer number <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                id="dealerNum"
                list="opt-dealer-nums"
                placeholder="Buyer contact / ID"
                value={shared.dealerNumber}
                onChange={(e) => {
                  const v = e.target.value;
                  const match = findByDealerNumber(v);
                  setShared((f) => ({
                    ...f,
                    dealerNumber: v,
                    buyerName: match ? match.buyerName : f.buyerName,
                  }));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custNum">
                Customer number <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                id="custNum"
                list="opt-customer-nums"
                placeholder="Customer contact / ID"
                value={shared.customerNumber}
                onChange={(e) => {
                  const v = e.target.value;
                  const match = findByCustomerNumber(v);
                  setShared((f) => ({
                    ...f,
                    customerNumber: v,
                    customerName: match ? match.customerName : f.customerName,
                  }));
                }}
              />
            </div>
          </div>

          <datalist id="opt-products">
            {productOpts.map((v) => <option key={v} value={v} />)}
          </datalist>
          <datalist id="opt-buyers">
            {buyerOpts.map((v) => <option key={v} value={v} />)}
          </datalist>
          <datalist id="opt-customers">
            {customerOpts.map((v) => <option key={v} value={v} />)}
          </datalist>
          <datalist id="opt-dealer-nums">
            {dealerNumOpts.map((v) => <option key={v} value={v} />)}
          </datalist>
          <datalist id="opt-customer-nums">
            {customerNumOpts.map((v) => <option key={v} value={v} />)}
          </datalist>

          <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              Total:{" "}
              <span className="font-semibold text-foreground">{formatMoney(totalRevenue)}</span>
            </span>
            <span className="text-muted-foreground">
              Profit:{" "}
              <span
                className={cn(
                  "font-semibold",
                  totalProfit > 0 ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {formatMoney(totalProfit)}
              </span>
            </span>
          </div>

          <div className="space-y-1.5">
            <Label>Payment status</Label>
            <div className="grid grid-cols-3 gap-1.5 rounded-md border bg-muted/30 p-1">
              {(["paid", "partial", "unpaid"] as PaymentStatus[]).map((s) => {
                const active = shared.paymentStatus === s;
                const color =
                  s === "paid"
                    ? "bg-success text-white"
                    : s === "partial"
                      ? "bg-warning text-warning-foreground"
                      : "bg-destructive text-destructive-foreground";
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setShared({ ...shared, paymentStatus: s })}
                    className={cn(
                      "rounded px-2 py-1.5 text-xs font-medium capitalize transition-colors",
                      active ? color : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            {sale && (
              <p className="text-[10px] text-muted-foreground">
                Auto-updated when you record payments below.
              </p>
            )}
          </div>

          {!sale && shared.paymentStatus !== "unpaid" && (
            <div className="space-y-1.5">
              <Label htmlFor="received">Amount received now</Label>
              <div className="flex gap-2">
                <Input
                  id="received"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={amountReceived === 0 ? "" : String(amountReceived)}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    setReceivedTouched(true);
                    setAmountReceived(v === "" ? 0 : Number(v));
                  }}
                />
                {totalRevenue > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setReceivedTouched(true);
                      setAmountReceived(totalRevenue);
                    }}
                  >
                    Full
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Recorded as a payment entry. Leave 0 if nothing received yet.
              </p>
            </div>
          )}

          {sale && <PaymentsSection sale={sale} />}

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={2}
              value={shared.notes}
              onChange={(e) => setShared({ ...shared, notes: e.target.value })}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            {sale && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.open(whatsAppUrl(sale), "_blank")}
                  className="gap-1"
                >
                  <MessageCircle className="size-4" /> WhatsApp
                </Button>
                <Button type="button" variant="destructive" onClick={remove} disabled={busy}>
                  Delete
                </Button>
              </>
            )}
            <Button type="submit" disabled={busy}>
              {sale ? "Save" : items.length > 1 ? `Add ${items.length} sales` : "Add sale"}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SaleView({
  sale,
  onEdit,
  onClose,
}: {
  sale: Sale;
  onEdit: () => void;
  onClose: () => void;
}) {
  const due = balanceDue(sale);
  const end = warrantyEnd(sale);
  const payColor =
    sale.paymentStatus === "paid"
      ? "bg-success/15 text-success"
      : sale.paymentStatus === "partial"
        ? "bg-warning/20 text-warning-foreground"
        : "bg-destructive/15 text-destructive";
  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-muted/30 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-display text-base font-bold">
              {sale.productName}
            </div>
            <div className="text-xs text-muted-foreground">
              {sale.customerName || "—"} · {sale.durationMonths}mo
              {sale.quantity > 1 ? ` · ×${sale.quantity}` : ""}
            </div>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
              payColor,
            )}
          >
            {sale.paymentStatus}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-background px-2 py-1.5">
            <div className="text-[10px] uppercase text-muted-foreground">Sell</div>
            <div className="text-sm font-semibold">{formatMoney(sale.sellPrice)}</div>
          </div>
          <div className="rounded-md bg-background px-2 py-1.5">
            <div className="text-[10px] uppercase text-muted-foreground">Buy</div>
            <div className="text-sm font-semibold">{formatMoney(sale.buyPrice)}</div>
          </div>
          <div className="rounded-md bg-background px-2 py-1.5">
            <div className="text-[10px] uppercase text-muted-foreground">Profit</div>
            <div className="text-sm font-semibold text-primary">
              {formatMoney(sale.sellPrice - sale.buyPrice)}
            </div>
          </div>
        </div>
        {due > 0 && (
          <div className="mt-2 rounded-md bg-destructive/10 px-2 py-1.5 text-center text-xs font-semibold text-destructive">
            {formatMoney(due)} due
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md border bg-background p-2">
          <div className="text-muted-foreground">Buyer / Dealer</div>
          <div className="font-medium">{sale.buyerName || "—"}</div>
          {sale.dealerNumber && (
            <div className="text-muted-foreground">{sale.dealerNumber}</div>
          )}
        </div>
        <div className="rounded-md border bg-background p-2">
          <div className="text-muted-foreground">Customer</div>
          <div className="font-medium">{sale.customerName || "—"}</div>
          {sale.customerNumber && (
            <div className="text-muted-foreground">{sale.customerNumber}</div>
          )}
        </div>
        <div className="rounded-md border bg-background p-2">
          <div className="text-muted-foreground">Warranty start</div>
          <div className="font-medium">{format(new Date(sale.warrantyStart), "PP")}</div>
        </div>
        <div className="rounded-md border bg-background p-2">
          <div className="text-muted-foreground">Warranty end</div>
          <div className="font-medium">{format(end, "PP")}</div>
        </div>
      </div>

      {sale.notes && (
        <div className="rounded-md border bg-muted/20 p-2 text-xs">
          <div className="mb-0.5 text-muted-foreground">Notes</div>
          <div className="whitespace-pre-wrap">{sale.notes}</div>
        </div>
      )}

      <PaymentsSection sale={sale} />

      <DialogFooter className="gap-2 sm:gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.open(whatsAppUrl(sale), "_blank")}
          className="gap-1"
        >
          <MessageCircle className="size-4" /> WhatsApp
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Close
        </Button>
        <Button type="button" onClick={onEdit} className="gap-1">
          <Pencil className="size-4" /> Edit
        </Button>
      </DialogFooter>
    </div>
  );
}
