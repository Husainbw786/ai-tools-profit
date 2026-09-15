import { useState } from "react";
import { format } from "date-fns";
import { Trash2, Plus, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  usePaymentsForSale,
  useCreatePayment,
  useDeletePayment,
} from "@/hooks/use-payments";
import { balanceDue, formatMoney, lineTotal, type Sale } from "@/lib/sale-utils";

export function PaymentsSection({ sale }: { sale: Sale }) {
  const { data: payments = [], isLoading } = usePaymentsForSale(sale.id);
  const createMut = useCreatePayment(sale.id);
  const deleteMut = useDeletePayment(sale.id);

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  // Use the freshly loaded payments rather than the server-aggregated amount.
  const balance = balanceDue(sale, totalPaid);

  const [amount, setAmount] = useState<number>(0);
  const [paidAt, setPaidAt] = useState<Date>(new Date());
  const [method, setMethod] = useState("");
  const [note, setNote] = useState("");
  const [showForm, setShowForm] = useState(false);

  const add = async () => {
    if (!amount || amount <= 0) {
      toast.error("Enter an amount");
      return;
    }
    try {
      await createMut.mutateAsync({
        amount,
        paidAt: paidAt.toISOString(),
        method: method.trim() || null,
        note: note.trim() || null,
      });
      toast.success("Payment recorded");
      setAmount(0);
      setMethod("");
      setNote("");
      setPaidAt(new Date());
      setShowForm(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteMut.mutateAsync(id);
      toast.success("Payment removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const quickFill = () => setAmount(balance);

  return (
    <div className="space-y-2 rounded-md border bg-muted/20 p-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Payment history</Label>
        <div className="text-right text-xs">
          <div className="text-muted-foreground">
            Paid <span className="font-semibold text-success">{formatMoney(totalPaid)}</span>{" "}
            of {formatMoney(lineTotal(sale))}
          </div>
          {balance > 0 ? (
            <div className="font-semibold text-destructive">
              {formatMoney(balance)} due
            </div>
          ) : (
            <div className="font-semibold text-success">Fully paid</div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-2 text-center text-xs text-muted-foreground">Loading…</div>
      ) : payments.length === 0 ? (
        <div className="py-2 text-center text-xs text-muted-foreground">
          No payments recorded yet
        </div>
      ) : (
        <ul className="space-y-1">
          {payments.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded bg-background px-2.5 py-1.5 text-xs"
            >
              <div className="min-w-0">
                <div className="font-semibold">{formatMoney(p.amount)}</div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {format(new Date(p.paidAt), "PP")}
                  {p.method ? ` · ${p.method}` : ""}
                  {p.note ? ` · ${p.note}` : ""}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={() => remove(p.id)}
                disabled={deleteMut.isPending}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <div className="space-y-2 rounded border bg-background p-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Amount</Label>
              <div className="flex gap-1">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={amount === 0 ? "" : String(amount)}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    setAmount(v === "" ? 0 : Number(v));
                  }}
                />
                {balance > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-[10px]"
                    onClick={quickFill}
                  >
                    Due
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn("w-full justify-start text-xs font-normal")}
                  >
                    <CalendarIcon className="mr-1 size-3.5" />
                    {format(paidAt, "PP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={paidAt}
                    onSelect={(d) => d && setPaidAt(d)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Method (UPI, Cash…)"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="text-xs"
            />
            <Input
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="text-xs"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="flex-1"
              onClick={add}
              disabled={createMut.isPending}
            >
              {createMut.isPending ? "Saving…" : "Record payment"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            setAmount(balance > 0 ? balance : 0);
            setShowForm(true);
          }}
        >
          <Plus className="size-3.5" /> Add payment
        </Button>
      )}
    </div>
  );
}