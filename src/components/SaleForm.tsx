import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { SuggestInput, countOptions } from "@/components/SuggestInput";
import { Kicker, SegmentedPill } from "@/components/primitives";
import { Bone } from "@/components/skeletons";
import { friendlyError } from "@/lib/request-error";
import { cn } from "@/lib/utils";
import { useCreateSale, useSales, useUpdateSale } from "@/hooks/use-sales";
import {
  buildDealerOrderMessage,
  formatMoney,
  statusLabel,
  statusTagClass,
  whatsAppShareUrl,
  type PaymentStatus,
  type Sale,
} from "@/lib/sale-utils";

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

const Calendar = lazy(() =>
  import("@/components/ui/calendar").then((m) => ({ default: m.Calendar })),
);

const numeric = (v: string) => {
  const digits = v.replace(/\D/g, "");
  return digits === "" ? 0 : Number(digits);
};

const PAY_OPTIONS: { id: PaymentStatus; label: string }[] = [
  { id: "paid", label: "Paid" },
  { id: "partial", label: "Partial" },
  { id: "unpaid", label: "Unpaid" },
];

// Editing a sale with no recorded payments: "partial" would claim money was
// received without any payment row to back it, so only the two manual marks.
const MANUAL_PAY_OPTIONS: { id: PaymentStatus; label: string }[] = [
  { id: "paid", label: "Paid" },
  { id: "unpaid", label: "Unpaid" },
];

/**
 * New / edit sale form. In new mode several products can be added and are
 * saved as separate sales sharing dealer, customer and dates; the amount
 * received is waterfalled across them.
 */
export function SaleForm({
  sale,
  onSaved,
  onBusyChange,
}: {
  sale: Sale | null;
  onSaved: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
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
  const receivedTouched = useRef(false);
  const [error, setError] = useState<string | null>(null);
  // Once payments exist, the status is derived from them (see the DB trigger);
  // the form must not overwrite it.
  const hasPayments = (sale?.amountPaid ?? 0) > 0;

  const createMut = useCreateSale();
  const updateMut = useUpdateSale();
  const { data: allSales = [] } = useSales();
  const busy = createMut.isPending || updateMut.isPending;
  useEffect(() => {
    onBusyChange?.(busy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

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

  // Auto-sync received amount with status / total. A "partial" amount the user
  // typed is left alone.
  useEffect(() => {
    if (sale) return;
    if (shared.paymentStatus === "paid") setAmountReceived(totalRevenue);
    else if (shared.paymentStatus === "unpaid") setAmountReceived(0);
    else if (!receivedTouched.current) setAmountReceived(0);
  }, [shared.paymentStatus, totalRevenue, sale]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some((it) => !it.productName.trim())) {
      setError("Each product needs a name");
      return;
    }
    setError(null);
    if (sale) {
      const it = items[0];
      const { paymentStatus, ...sharedRest } = shared;
      try {
        await updateMut.mutateAsync({
          id: sale.id,
          patch: {
            ...sharedRest,
            productName: it.productName.trim(),
            durationMonths: it.durationMonths,
            quantity: it.quantity,
            buyPrice: it.buyPrice,
            sellPrice: it.sellPrice,
            hasWarranty: it.hasWarranty,
            ...(hasPayments ? {} : { paymentStatus }),
          },
        });
        toast.success("Sale updated");
        onSaved();
      } catch (err) {
        toast.error(friendlyError(err, "Save failed. Please try again."));
      }
      return;
    }

    // Waterfall the amount received across the products, then save them in
    // parallel so a multi-product sale costs one round trip, not N.
    let remainingReceived = Math.min(amountReceived, totalRevenue);
    const inputs = items.map((it) => {
      const lineTotal = it.sellPrice * (it.quantity || 1);
      const initialPaymentAmount = Math.max(0, Math.min(remainingReceived, lineTotal));
      remainingReceived -= initialPaymentAmount;
      return {
        ...shared,
        productName: it.productName.trim(),
        durationMonths: it.durationMonths,
        quantity: it.quantity,
        buyPrice: it.buyPrice,
        sellPrice: it.sellPrice,
        hasWarranty: it.hasWarranty,
        initialPaymentAmount,
      };
    });
    const results = await Promise.allSettled(inputs.map((input) => createMut.mutateAsync(input)));
    const failed = results.map((r, i) => (r.status === "rejected" ? i : -1)).filter((i) => i >= 0);
    if (failed.length === 0) {
      // One tap to ask the dealer to confirm the whole order just recorded.
      const created = results.flatMap((r) =>
        r.status === "fulfilled" && r.value ? [r.value] : [],
      );
      const hasDealer = shared.buyerName.trim() !== "" || shared.dealerNumber.trim() !== "";
      const dealerUrl =
        created.length > 0 && hasDealer
          ? whatsAppShareUrl(shared.dealerNumber, buildDealerOrderMessage(created))
          : null;
      toast.success(
        items.length > 1 ? `${items.length} sales added` : "Sale added",
        dealerUrl
          ? {
              duration: 6000,
              action: {
                label: "Confirm with dealer",
                onClick: () => window.open(dealerUrl, "_blank", "noopener,noreferrer"),
              },
            }
          : undefined,
      );
      onSaved();
      return;
    }
    const firstError = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    toast.error(friendlyError(firstError.reason, "Save failed. Please try again."));
    if (failed.length < items.length) {
      // Keep only the products that did not save so a retry cannot duplicate
      // the ones that did. Their share of the received amount comes with them.
      setItems(failed.map((i) => items[i]));
      receivedTouched.current = true;
      setAmountReceived(failed.reduce((a, i) => a + inputs[i].initialPaymentAmount, 0));
      setError(
        `Saved ${items.length - failed.length} of ${items.length}. The ${
          failed.length === 1 ? "product" : `${failed.length} products`
        } still shown ${failed.length === 1 ? "was" : "were"} not saved — tap the button to retry.`,
      );
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
            <Field
              label={
                <>
                  Buy price <span className="font-medium text-faint">(each)</span>
                </>
              }
            >
              <NumericInput
                value={it.buyPrice}
                placeholder="0"
                onChange={(n) => updateItem(idx, { buyPrice: n })}
              />
            </Field>
            <Field
              label={
                <>
                  Sell price <span className="font-medium text-faint">(each)</span>
                </>
              }
            >
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
            <Suspense fallback={<Bone className="m-3 h-[300px] w-[260px]" />}>
              <Calendar
                mode="single"
                selected={new Date(shared.warrantyStart)}
                onSelect={(d) => d && setShared({ ...shared, warrantyStart: d.toISOString() })}
                initialFocus
                className={cn("pointer-events-auto p-3")}
              />
            </Suspense>
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
      {sale && hasPayments ? (
        <>
          <div className="mt-2 flex items-center gap-2.5">
            <span
              className={cn(
                "rounded-full px-[9px] py-[3px] text-[11px] font-bold uppercase tracking-[0.04em]",
                statusTagClass(sale),
              )}
            >
              {statusLabel(sale)}
            </span>
            <span className="tabular text-[12px] text-muted-foreground">
              {formatMoney(sale.amountPaid)} received
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-faint">
            Worked out from the recorded payments and the total; record or remove payments on the
            sale to change it.
          </p>
        </>
      ) : (
        <>
          <SegmentedPill
            grow
            className="mt-2 text-[13px]"
            options={sale ? MANUAL_PAY_OPTIONS : PAY_OPTIONS}
            value={shared.paymentStatus}
            onChange={(s) => setShared({ ...shared, paymentStatus: s })}
          />
          {sale && (
            <p className="mt-1.5 text-[11px] text-faint">
              No payments recorded on this sale. Once you record one, the status follows the
              payments.
            </p>
          )}
        </>
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
                receivedTouched.current = true;
                setAmountReceived(n);
              }}
            />
            {totalRevenue > 0 && (
              <Button
                type="button"
                variant="outline"
                className="h-[46px] rounded-[12px] px-4 text-[13px]"
                onClick={() => {
                  receivedTouched.current = true;
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
