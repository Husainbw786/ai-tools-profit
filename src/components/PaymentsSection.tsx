import { lazy, Suspense, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Bone } from "@/components/skeletons";
import { friendlyError } from "@/lib/request-error";
import { usePaymentsForSale, useCreatePayment, useDeletePayment } from "@/hooks/use-payments";
import { formatDate, formatMoney, lineTotal, type Sale } from "@/lib/sale-utils";

const Calendar = lazy(() =>
  import("@/components/ui/calendar").then((m) => ({ default: m.Calendar })),
);

export function PaymentsSection({ sale }: { sale: Sale }) {
  const { data: payments = [], isLoading } = usePaymentsForSale(sale.id);
  const createMut = useCreatePayment(sale.id);
  const deleteMut = useDeletePayment(sale.id);

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  // Sales marked paid before the payments ledger existed have no rows; they
  // count as settled rather than as owing the full amount.
  const legacyPaid = !isLoading && sale.paymentStatus === "paid" && payments.length === 0;
  const balance = legacyPaid ? 0 : Math.max(0, lineTotal(sale) - totalPaid);

  const [amount, setAmount] = useState<number>(0);
  const [paidAt, setPaidAt] = useState<Date>(new Date());
  const [method, setMethod] = useState("");
  const [note, setNote] = useState("");
  const [details, setDetails] = useState(false);

  const add = async () => {
    if (!amount || amount <= 0) {
      toast.error("Enter an amount");
      return;
    }
    if (amount > balance) {
      toast.error(`Only ${formatMoney(balance)} is due on this sale`);
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
      setDetails(false);
    } catch (e) {
      toast.error(friendlyError(e, "Could not record the payment."));
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteMut.mutateAsync(id);
      toast.success("Payment removed");
    } catch (e) {
      toast.error(friendlyError(e, "Could not remove the payment."));
    }
  };

  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between">
        <span className="text-[15px] font-bold">Payments</span>
        <span className="tabular text-[12px] text-muted-foreground">
          Paid{" "}
          <strong className="text-success">
            {formatMoney(legacyPaid ? lineTotal(sale) : totalPaid)}
          </strong>{" "}
          of {formatMoney(lineTotal(sale))}
        </span>
      </div>

      {isLoading ? (
        <div className="py-2.5 text-[12px] text-faint">Loading…</div>
      ) : payments.length === 0 ? (
        <div className="border-b border-hairline py-2.5 text-[13px] text-faint">
          {legacyPaid
            ? "Marked as paid · no individual payments recorded"
            : "No payments recorded yet"}
        </div>
      ) : (
        <ul>
          {payments.map((p) => (
            <li
              key={p.id}
              className="tabular flex items-center justify-between gap-3 border-b border-hairline py-2.5 text-[13px]"
            >
              <span className="min-w-0 truncate text-muted-foreground">
                {formatDate(p.paidAt)} · {p.method || "Payment"}
                {p.note ? ` · ${p.note}` : ""}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-bold">{formatMoney(p.amount)}</span>
                <button
                  type="button"
                  aria-label="Remove payment"
                  onClick={() => remove(p.id)}
                  disabled={deleteMut.isPending}
                  className="grid size-6 place-items-center rounded-full text-faint transition hover:bg-secondary hover:text-destructive disabled:opacity-50"
                >
                  <X className="size-3" strokeWidth={2.4} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {balance > 0 && (
        <div className="mt-3">
          <div className="flex gap-2">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="h-11 flex-1 text-[14px] font-semibold"
              value={amount === 0 ? "" : String(amount)}
              placeholder="Amount"
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                setAmount(v === "" ? 0 : Number(v));
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-[12px] px-3.5 text-[13px]"
              onClick={() => setAmount(balance)}
            >
              Due
            </Button>
            <Button
              type="button"
              variant="inverse"
              className="h-11 rounded-[12px] px-4 text-[13px]"
              onClick={add}
              disabled={createMut.isPending}
            >
              {createMut.isPending ? "Saving…" : "Record"}
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setDetails((v) => !v)}
            className="mt-2 text-[12px] font-semibold text-muted-foreground transition hover:text-foreground"
          >
            {details ? "Hide details" : "Add date, method or note"}
          </button>
          {details && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex h-11 items-center gap-2 rounded-[12px] border border-border px-3 text-left text-[13px]",
                    )}
                  >
                    <CalendarIcon className="size-3.5 text-muted-foreground" />
                    {format(paidAt, "d MMM yyyy")}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Suspense fallback={<Bone className="m-3 h-[300px] w-[260px]" />}>
                    <Calendar
                      mode="single"
                      selected={paidAt}
                      onSelect={(d) => d && setPaidAt(d)}
                      initialFocus
                      className={cn("pointer-events-auto p-3")}
                    />
                  </Suspense>
                </PopoverContent>
              </Popover>
              <Input
                className="h-11 text-[13px]"
                placeholder="Method (UPI, Cash…)"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              />
              <Input
                className="col-span-2 h-11 text-[13px]"
                placeholder="Note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
