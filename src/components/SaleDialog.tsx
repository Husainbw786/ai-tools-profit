import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
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
import { useCreateSale, useDeleteSale, useUpdateSale } from "@/hooks/use-sales";
import { formatMoney, type Sale } from "@/lib/sale-utils";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sale?: Sale | null;
};

const empty = {
  productName: "",
  durationMonths: 1,
  buyerName: "",
  customerName: "",
  buyPrice: 0,
  sellPrice: 0,
  warrantyStart: new Date().toISOString(),
  notes: "",
  customerNumber: "",
  dealerNumber: "",
  hasWarranty: true,
};

export function SaleDialog({ open, onOpenChange, sale }: Props) {
  const [form, setForm] = useState(empty);
  const createMut = useCreateSale();
  const updateMut = useUpdateSale();
  const deleteMut = useDeleteSale();
  const busy = createMut.isPending || updateMut.isPending || deleteMut.isPending;

  useEffect(() => {
    if (open) {
      setForm(
        sale
          ? {
              productName: sale.productName,
              durationMonths: sale.durationMonths,
              buyerName: sale.buyerName,
              customerName: sale.customerName,
              buyPrice: sale.buyPrice,
              sellPrice: sale.sellPrice,
              warrantyStart: sale.warrantyStart,
              notes: sale.notes ?? "",
              customerNumber: sale.customerNumber ?? "",
              dealerNumber: sale.dealerNumber ?? "",
              hasWarranty: sale.hasWarranty,
            }
          : { ...empty, warrantyStart: new Date().toISOString() },
      );
    }
  }, [open, sale]);

  const profit = form.sellPrice - form.buyPrice;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productName.trim()) {
      toast.error("Product name is required");
      return;
    }
    try {
      if (sale) {
        await updateMut.mutateAsync({ id: sale.id, patch: form });
        toast.success("Sale updated");
      } else {
        await createMut.mutateAsync(form);
        toast.success("Sale added");
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
          <DialogTitle>{sale ? "Edit sale" : "Add sale"}</DialogTitle>
          <DialogDescription>Record a subscription you resold.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="product">Product</Label>
            <Input
              id="product"
              placeholder="LinkedIn Premium Career"
              value={form.productName}
              onChange={(e) => setForm({ ...form, productName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dur">Duration (months)</Label>
              <Input
                id="dur"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.durationMonths === 0 ? "" : String(form.durationMonths)}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  setForm({ ...form, durationMonths: v === "" ? 0 : Number(v) });
                }}
                onBlur={() => {
                  if (!form.durationMonths || form.durationMonths < 1)
                    setForm({ ...form, durationMonths: 1 });
                }}
              />
            </div>
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
                    {format(new Date(form.warrantyStart), "PP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={new Date(form.warrantyStart)}
                    onSelect={(d) =>
                      d && setForm({ ...form, warrantyStart: d.toISOString() })
                    }
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="buyer">Buyer</Label>
              <Input
                id="buyer"
                placeholder="Where you bought from"
                value={form.buyerName}
                onChange={(e) => setForm({ ...form, buyerName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer">Customer</Label>
              <Input
                id="customer"
                placeholder="Who you sold to"
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="buy">Buy price</Label>
              <Input
                id="buy"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.buyPrice === 0 ? "" : String(form.buyPrice)}
                placeholder="0"
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  setForm({ ...form, buyPrice: v === "" ? 0 : Number(v) });
                }}
                onBlur={() => {
                  if (form.buyPrice < 0) setForm({ ...form, buyPrice: 0 });
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sell">Sell price</Label>
              <Input
                id="sell"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.sellPrice === 0 ? "" : String(form.sellPrice)}
                placeholder="0"
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  setForm({ ...form, sellPrice: v === "" ? 0 : Number(v) });
                }}
                onBlur={() => {
                  if (form.sellPrice < 0) setForm({ ...form, sellPrice: 0 });
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dealerNum">Dealer number <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="dealerNum"
                placeholder="Buyer contact / ID"
                value={form.dealerNumber}
                onChange={(e) => setForm({ ...form, dealerNumber: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custNum">Customer number <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="custNum"
                placeholder="Customer contact / ID"
                value={form.customerNumber}
                onChange={(e) => setForm({ ...form, customerNumber: e.target.value })}
              />
            </div>
          </div>

          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Profit: </span>
            <span
              className={cn(
                "font-semibold",
                profit > 0 ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {formatMoney(profit)}
            </span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            {sale && (
              <Button type="button" variant="destructive" onClick={remove} disabled={busy}>
                Delete
              </Button>
            )}
            <Button type="submit" disabled={busy}>
              {sale ? "Save" : "Add sale"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}