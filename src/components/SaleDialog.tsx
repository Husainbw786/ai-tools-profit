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
                type="number"
                min={1}
                value={form.durationMonths}
                onChange={(e) =>
                  setForm({ ...form, durationMonths: Number(e.target.value) || 1 })
                }
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
                type="number"
                min={0}
                value={form.buyPrice}
                onChange={(e) => setForm({ ...form, buyPrice: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sell">Sell price</Label>
              <Input
                id="sell"
                type="number"
                min={0}
                value={form.sellPrice}
                onChange={(e) => setForm({ ...form, sellPrice: Number(e.target.value) || 0 })}
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
              <Button type="button" variant="destructive" onClick={remove}>
                Delete
              </Button>
            )}
            <Button type="submit">{sale ? "Save" : "Add sale"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}