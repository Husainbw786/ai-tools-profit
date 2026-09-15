import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { SuggestInput, countOptions } from "@/components/SuggestInput";
import { Kicker, SegmentedPill } from "@/components/primitives";
import { cn } from "@/lib/utils";
import { useCreateSale, useSales, useUpdateSale } from "@/hooks/use-sales";
import { formatMoney, type PaymentStatus, type Sale } from "@/lib/sale-utils";

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

const numeric = (v: string) => {
  const digits = v.replace(/\D/g, "");
  return digits === "" ? 0 : Number(digits);
};

const PAY_OPTIONS: { id: PaymentStatus; label: string }[] = [
  { id: "paid", label: "Paid" },
  { id: "partial", label: "Partial" },
  { id: "unpaid", label: "Unpaid" },
];

/**
 * New / edit sale form. In new mode several products can be added and are
 * saved as separate sales sharing dealer, customer and dates; the amount
 * received is waterfalled across them.
 */
export function SaleForm({ sale, onSaved }: { sale: Sale | null; onSaved: () => void }) {
  const [shared, setShared] = useState(() =>
    sale
      ? {
          buyerName: sale.buyerName,
          customerName: sale.customerName,
          warrantyStart: sale.warrantyStart,
          notes: sale.notes ?? "",
          customerNumber: sale.customerNumber ?? "",
          dealerNumber: sale.dealerNumber ?? "",
          paymentStatus: sale.paymentStatus,
        }
      : emptyShared(),
  );
  const [items, setItems] = useState<Item[]>(() =>
    sale
      ? [
          {
            productName: sale.productName,
            durationMonths: sale.durationMonths,
            quantity: sale.quantity ?? 1,
            buyPrice: sale.buyPrice,
            sellPrice: sale.sellPrice,
            hasWarranty: sale.hasWarranty,
          },
        ]
      : [emptyItem()],
  );
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [receivedTouched, setReceivedTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMut = useCreateSale();
  const updateMut = useUpdateSale();
  const { data: allSales = [] } = useSales();
  const busy = createMut.isPending || updateMut.isPending;

  const productOpts = useMemo(() => countOptions(allSales.map((s) => s.productName)), [allSales]);
  const buyerOpts = useMemo(() => countOptions(allSales.map((s) => s.buyerName)), [allSales]);
  const customerOpts = useMemo(() => countOptions(allSales.map((s) => s.customerName)), [allSales]);
  const dealerNumOpts = useMemo(
    () => countOptions(allSales.map((s) => s.dealerNumber)),
    [allSales],
  );
  const customerNumOpts = useMemo(
    () => countOptions(allSales.map((s) => s.customerNumber)),
    [allSales],
  );

  // Cross-fill lookups: name ↔ number, both directions.
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
    allSales.find((s) => (s.dealerNumber ?? "").trim() === num.trim() && s.buyerName.trim() !== "");

  const setBuyer = (v: string) => {
    const match = findByBuyerName(v);
    setShared((f) => ({
      ...f,
      buyerName: v,
      dealerNumber: match ? (match.dealerNumber ?? f.dealerNumber) : f.dealerNumber,
    }));
  };
  const setCustomer = (v: string) => {
    const match = findByCustomerName(v);
    setShared((f) => ({
      ...f,
      customerName: v,
      customerNumber: match ? (match.customerNumber ?? f.customerNumber) : f.customerNumber,
    }));
  };
  const setDealerNumber = (v: string) => {
    const match = findByDealerNumber(v);
    setShared((f) => ({ ...f, dealerNumber: v, buyerName: match ? match.buyerName : f.buyerName }));
  };
  const setCustomerNumber = (v: string) => {
    const match = findByCustomerNumber(v);
    setShared((f) => ({
      ...f,
      customerNumber: v,
      customerName: match ? match.customerName : f.customerName,
    }));
  };

  const updateItem = (i: number, patch: Partial<Item>) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removeItem = (i: number) =>
    setItems((arr) => (arr.length <= 1 ? arr : arr.filter((_, idx) => idx !== i)));

  const totalRevenue = items.reduce((s, it) => s + it.sellPrice * (it.quantity || 1), 0);
  const totalProfit = items.reduce(
    (s, it) => s + (it.sellPrice - it.buyPrice) * (it.quantity || 1),
    0,
  );

  // Auto-sync received amount with status / total until the user edits it.
  useEffect(() => {
    if (sale) return;
    if (receivedTouched && shared.paymentStatus === "partial") return;
    if (shared.paymentStatus === "paid") setAmountReceived(totalRevenue);
    else if (shared.paymentStatus === "unpaid") setAmountReceived(0);
    else if (shared.paymentStatus === "partial" && !receivedTouched) setAmountReceived(0);
  }, [shared.paymentStatus, totalRevenue, sale, receivedTouched]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some((it) => !it.productName.trim())) {
      setError("Each product needs a name");
      return;
    }
    setError(null);
    try {
      if (sale) {
        const it = items[0];
        await updateMut.mutateAsync({
          id: sale.id,
          patch: {
            ...shared,
            productName: it.productName.trim(),
            durationMonths: it.durationMonths,
            quantity: it.quantity,
            buyPrice: it.buyPrice,
            sellPrice: it.sellPrice,
            hasWarranty: it.hasWarranty,
          },
        });
        toast.success("Sale updated");
      } else {
        let remainingReceived = Math.min(amountReceived, totalRevenue);
        for (const it of items) {
          const lineTotal = it.sellPrice * (it.quantity || 1);
          const initialPaymentAmount = Math.max(0, Math.min(remainingReceived, lineTotal));
          await createMut.mutateAsync({
            ...shared,
            productName: it.productName.trim(),
            durationMonths: it.durationMonths,
            quantity: it.quantity,
            buyPrice: it.buyPrice,
            sellPrice: it.sellPrice,
            hasWarranty: it.hasWarranty,
            initialPaymentAmount,
          });
          remainingReceived -= initialPaymentAmount;
        }
        toast.success(items.length > 1 ? `${items.length} sales added` : "Sale added");
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  const isNew = !sale;
  const cta = isNew
    ? items.length > 1
      ? `Add ${items.length} sales`
      : "Add sale"
    : "Save changes";

  return (
    <form onSubmit={submit} noValidate>
      {items.map((it, idx) => (
        <div key={idx} className="mt-5 border-t border-border pt-3.5">
          <div className="flex items-center justify-between">
            <Kicker>PRODUCT {idx + 1}</Kicker>
            {isNew && items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="text-[12px] font-bold text-destructive"
              >
                Remove
              </button>
            )}
          </div>

          <Label className="mt-3">Product</Label>
          <SuggestInput
            className="mt-1.5"
            placeholder="LinkedIn Premium Career"
            value={it.productName}
            onChange={(v) => updateItem(idx, { productName: v })}
            options={productOpts}
          />

          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Duration (months)">
              <NumericInput
                value={it.durationMonths}
                onChange={(n) => updateItem(idx, { durationMonths: n })}
                onBlur={() => {
                  if (!it.durationMonths || it.durationMonths < 1)
                    updateItem(idx, { durationMonths: 1 });
                }}
              />
            </Field>
            <Field label="Quantity">
              <NumericInput
                value={it.quantity}
                onChange={(n) => updateItem(idx, { quantity: n })}
                onBlur={() => {
                  if (!it.quantity || it.quantity < 1) updateItem(idx, { quantity: 1 });
                }}
              />
            </Field>
            <Field label="Buy price">
              <NumericInput
                value={it.buyPrice}
                placeholder="0"
                onChange={(n) => updateItem(idx, { buyPrice: n })}
              />
            </Field>
            <Field label="Sell price">
              <NumericInput
                value={it.sellPrice}
                placeholder="0"
                onChange={(n) => updateItem(idx, { sellPrice: n })}
              />
            </Field>
          </div>

          <label className="mt-3 flex cursor-pointer items-center justify-between py-3">
            <span className="text-[14px] font-semibold">Under warranty</span>
            <Switch
              checked={it.hasWarranty}
              onCheckedChange={(v) => updateItem(idx, { hasWarranty: v })}
            />
          </label>
        </div>
      ))}

      {isNew && (
        <button
          type="button"
          onClick={() => setItems((a) => [...a, emptyItem()])}
          className="grid h-11 w-full place-items-center rounded-[12px] border border-dashed border-border text-[13px] font-bold text-muted-foreground transition hover:text-foreground"
        >
          + Add another product
        </button>
      )}

      <div className="mt-5 border-t border-border pt-3.5">
        <Kicker>WARRANTY &amp; PARTIES</Kicker>

        <Label className="mt-3">Warranty start</Label>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="mt-1.5 flex h-[46px] w-full items-center gap-2.5 rounded-[12px] border border-border px-3.5 text-left text-[15px] transition-colors focus-visible:border-primary focus-visible:outline-none"
            >
              <CalendarIcon className="size-4 text-muted-foreground" />
              {format(new Date(shared.warrantyStart), "d MMM yyyy")}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={new Date(shared.warrantyStart)}
              onSelect={(d) => d && setShared({ ...shared, warrantyStart: d.toISOString() })}
              initialFocus
              className={cn("pointer-events-auto p-3")}
            />
          </PopoverContent>
        </Popover>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Dealer">
            <SuggestInput
              placeholder="Where you bought from"
              value={shared.buyerName}
              onChange={setBuyer}
              options={buyerOpts}
            />
          </Field>
          <Field label="Customer">
            <SuggestInput
              placeholder="Who you sold to"
              value={shared.customerName}
              onChange={setCustomer}
              options={customerOpts}
              alignRight
            />
          </Field>
          <Field
            label={
              <>
                Dealer number <span className="font-medium text-faint">(optional)</span>
              </>
            }
          >
            <SuggestInput
              placeholder="Contact / ID"
              value={shared.dealerNumber}
              onChange={setDealerNumber}
              options={dealerNumOpts}
            />
          </Field>
          <Field
            label={
              <>
                Customer number <span className="font-medium text-faint">(optional)</span>
              </>
            }
          >
            <SuggestInput
              placeholder="Contact / ID"
              value={shared.customerNumber}
              onChange={setCustomerNumber}
              options={customerNumOpts}
              alignRight
            />
          </Field>
        </div>
      </div>

      <div className="tabular mt-5 grid grid-cols-2 border-y border-border">
        <div className="py-4">
          <div className="text-[11px] font-semibold text-muted-foreground">Total</div>
          <div className="mt-1 font-display text-[28px] font-medium tracking-[-0.02em]">
            {formatMoney(totalRevenue)}
          </div>
        </div>
        <div className="border-l border-hairline py-4 pl-[18px]">
          <div className="text-[11px] font-semibold text-muted-foreground">Profit</div>
          <div className="mt-1 font-display text-[28px] font-medium tracking-[-0.02em] text-accent-text">
            {formatMoney(totalProfit)}
          </div>
        </div>
      </div>

      <Label className="mt-[18px]">Payment status</Label>
      <SegmentedPill
        grow
        className="mt-2 text-[13px]"
        options={PAY_OPTIONS}
        value={shared.paymentStatus}
        onChange={(s) => setShared({ ...shared, paymentStatus: s })}
      />
      {sale && (
        <p className="mt-1.5 text-[11px] text-faint">
          Auto-updated when you record payments on the sale.
        </p>
      )}

      {isNew && shared.paymentStatus !== "unpaid" && (
        <>
          <Label className="mt-4">Amount received now</Label>
          <div className="mt-1.5 flex gap-2">
            <NumericInput
              value={amountReceived}
              placeholder="0"
              className="flex-1"
              onChange={(n) => {
                setReceivedTouched(true);
                setAmountReceived(n);
              }}
            />
            {totalRevenue > 0 && (
              <Button
                type="button"
                variant="outline"
                className="h-[46px] rounded-[12px] px-4 text-[13px]"
                onClick={() => {
                  setReceivedTouched(true);
                  setShared((current) => ({ ...current, paymentStatus: "paid" }));
                  setAmountReceived(totalRevenue);
                }}
              >
                Full
              </Button>
            )}
          </div>
          <p className="mt-1.5 text-[11px] text-faint">
            Recorded as a payment entry. Leave 0 if nothing received yet.
          </p>
        </>
      )}

      <Label className="mt-4" htmlFor="sale-notes">
        Notes
      </Label>
      <Textarea
        id="sale-notes"
        className="mt-1.5"
        rows={2}
        placeholder="Optional"
        value={shared.notes}
        onChange={(e) => setShared({ ...shared, notes: e.target.value })}
      />

      {error && <div className="mt-3 text-[13px] font-bold text-destructive">{error}</div>}

      <Button type="submit" size="lg" className="mt-5 w-full" disabled={busy}>
        {busy ? "Saving…" : cta}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function NumericInput({
  value,
  onChange,
  onBlur,
  placeholder,
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      className={className}
      value={value === 0 ? "" : String(value)}
      placeholder={placeholder}
      onFocus={(e) => e.target.select()}
      onChange={(e) => onChange(numeric(e.target.value))}
      onBlur={onBlur}
    />
  );
}
