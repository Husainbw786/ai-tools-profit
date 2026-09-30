/*
 * Ledger row → DTO mappers, shared by the browser reads (src/lib/ledger-reads.ts)
 * and the server-function writes (src/lib/*.functions.ts) so both sides hand the
 * UI identical objects.
 */
import type { Tables } from "@/integrations/supabase/types";

export type SaleDTO = {
  id: string;
  productName: string;
  durationMonths: number;
  quantity: number;
  buyerName: string;
  customerName: string;
  buyPrice: number;
  sellPrice: number;
  warrantyStart: string;
  notes: string | null;
  customerNumber: string | null;
  dealerNumber: string | null;
  hasWarranty: boolean;
  paymentStatus: "paid" | "unpaid" | "partial";
  amountPaid: number;
  createdAt: string;
  refundedAt: string | null;
  refundAmount: number | null;
  refundReason: string | null;
};

export type PaymentDTO = {
  id: string;
  saleId: string;
  amount: number;
  paidAt: string;
  method: string | null;
  note: string | null;
  createdAt: string;
};

export type ContactDTO = {
  id: string;
  kind: "customer" | "dealer";
  nameKey: string;
  displayName: string;
  tags: string[];
  notes: string | null;
};

type SaleRow = Tables<"sales">;
type PaymentRow = Tables<"sale_payments">;
type ContactRow = Tables<"contacts">;

export const saleToDTO = (row: SaleRow, amountPaid = 0): SaleDTO => ({
  id: row.id,
  productName: row.product_name,
  durationMonths: row.duration_months,
  quantity: row.quantity ?? 1,
  buyerName: row.buyer_name ?? "",
  customerName: row.customer_name ?? "",
  buyPrice: Number(row.buy_price),
  sellPrice: Number(row.sell_price),
  warrantyStart: row.warranty_start,
  notes: row.notes ?? null,
  customerNumber: row.customer_number ?? null,
  dealerNumber: row.dealer_number ?? null,
  hasWarranty: row.has_warranty ?? true,
  paymentStatus: (row.payment_status ?? "paid") as SaleDTO["paymentStatus"],
  amountPaid,
  createdAt: row.created_at,
  refundedAt: row.refunded_at ?? null,
  refundAmount: row.refund_amount != null ? Number(row.refund_amount) : null,
  refundReason: row.refund_reason ?? null,
});

export const paymentToDTO = (row: PaymentRow): PaymentDTO => ({
  id: row.id,
  saleId: row.sale_id,
  amount: Number(row.amount),
  paidAt: row.paid_at,
  method: row.method ?? null,
  note: row.note ?? null,
  createdAt: row.created_at,
});

export const contactToDTO = (row: ContactRow): ContactDTO => ({
  id: row.id,
  kind: row.kind as ContactDTO["kind"],
  nameKey: row.name_key,
  displayName: row.display_name,
  tags: row.tags ?? [],
  notes: row.notes ?? null,
});

/** Sums payments per sale so each sale carries its own amountPaid. */
export function paidBySaleMap(pays: Array<{ sale_id: string; amount: number }>) {
  const paidBySale = new Map<string, number>();
  for (const p of pays) {
    paidBySale.set(p.sale_id, (paidBySale.get(p.sale_id) ?? 0) + Number(p.amount));
  }
  return paidBySale;
}
