import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { SaleView } from "@/components/SaleView";
import { SaleForm } from "@/components/SaleForm";
import type { Sale } from "@/lib/sale-utils";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sale?: Sale | null;
};

/**
 * Bottom sheet for viewing, editing and creating sales. `sale` set → opens in
 * view mode (Edit switches to the form); `sale` null → new-sale form.
 */
export function SaleSheet({ open, onOpenChange, sale }: Props) {
  const [mode, setMode] = useState<"view" | "edit">(sale ? "view" : "edit");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setMode(sale ? "view" : "edit");
    if (!open) setBusy(false);
  }, [open, sale]);

  const isNew = !sale;
  const isView = !!sale && mode === "view";
  const qty = sale?.quantity || 1;

  const title = isNew ? "New sale" : isView ? sale.productName : "Edit sale";
  const sub = isNew
    ? "Record a subscription resale"
    : isView
      ? `${sale.customerName || "—"} · ${sale.durationMonths} mo${qty > 1 ? ` · ×${qty}` : ""}`
      : "Update this sale";

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        if (!o && busy) return; // keep the sheet up while a save is in flight
        onOpenChange(o);
      }}
      dismissible={!busy}
      repositionInputs={false}
    >
      <DrawerContent>
        <DrawerHeader>
          <div className="min-w-0">
            <DrawerTitle className="truncate">{title}</DrawerTitle>
            <DrawerDescription>{sub}</DrawerDescription>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground transition hover:text-foreground"
          >
            <X className="size-3.5" strokeWidth={2.4} />
          </button>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto px-6 pb-[max(env(safe-area-inset-bottom),28px)]">
          {isView ? (
            <SaleView
              sale={sale}
              onEdit={() => setMode("edit")}
              onClose={() => onOpenChange(false)}
            />
          ) : (
            <SaleForm
              key={sale?.id ?? "new"}
              sale={sale ?? null}
              onBusyChange={setBusy}
              onSaved={() => {
                if (sale) setMode("view");
                else onOpenChange(false);
              }}
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
