import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { TablesUpdate } from "@/integrations/supabase/types";

const SaleInput = z.object({
  productName: z.string().min(1).max(200),
  durationMonths: z.number().int().min(1).max(120),
  quantity: z.number().int().min(1).max(10000).default(1),
  buyerName: z.string().max(200).default(""),
  customerName: z.string().max(200).default(""),
  buyPrice: z.number().min(0),
  sellPrice: z.number().min(0),
  warrantyStart: z.string(), // ISO
  notes: z.string().max(2000).optional().nullable(),
  customerNumber: z.string().max(100).optional().nullable(),
  dealerNumber: z.string().max(100).optional().nullable(),
  hasWarranty: z.boolean().default(true),
  paymentStatus: z.enum(["paid", "unpaid", "partial"]).default("paid"),
  initialPaymentAmount: z.number().min(0).max(100_000_000).optional().default(0),
  refundedAt: z.string().nullable().optional(),
  refundAmount: z.number().min(0).max(100_000_000).nullable().optional(),
  refundReason: z.string().max(500).nullable().optional(),
});

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

const toDTO = (row: any, amountPaid = 0): SaleDTO => ({
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
  paymentStatus: (row.payment_status ?? "paid") as "paid" | "unpaid" | "partial",
  amountPaid,
  createdAt: row.created_at,
  refundedAt: row.refunded_at ?? null,
  refundAmount: row.refund_amount != null ? Number(row.refund_amount) : null,
  refundReason: row.refund_reason ?? null,
});

export const listSales = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [{ data, error }, { data: pays, error: payErr }] = await Promise.all([
      supabase.from("sales").select("*").order("warranty_start", { ascending: false }),
      supabase.from("sale_payments").select("sale_id, amount"),
    ]);
    if (error) throw new Error(error.message);
    if (payErr) throw new Error(payErr.message);
    const paidBySale = new Map<string, number>();
    for (const p of pays ?? []) {
      paidBySale.set(p.sale_id, (paidBySale.get(p.sale_id) ?? 0) + Number(p.amount));
    }
    return (data ?? []).map((r) => toDTO(r, paidBySale.get(r.id) ?? 0));
  });

export const createSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaleInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const initialPayment = Math.min(
      Math.max(0, data.initialPaymentAmount ?? 0),
      data.sellPrice * data.quantity,
    );
    const { data: row, error } = await supabase
      .from("sales")
      .insert({
        user_id: userId,
        product_name: data.productName,
        duration_months: data.durationMonths,
        quantity: data.quantity,
        buyer_name: data.buyerName,
        customer_name: data.customerName,
        buy_price: data.buyPrice,
        sell_price: data.sellPrice,
        warranty_start: data.warrantyStart,
        notes: data.notes ?? null,
        customer_number: data.customerNumber ?? null,
        dealer_number: data.dealerNumber ?? null,
        has_warranty: data.hasWarranty,
        payment_status: data.paymentStatus,
      } as any)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    if (initialPayment > 0) {
      const { error: paymentError } = await supabase
        .from("sale_payments")
        .insert({
          user_id: userId,
          sale_id: row.id,
          amount: initialPayment,
          paid_at: new Date().toISOString(),
          method: null,
          note: "Initial payment",
        })
        .select("*")
        .single();
      if (paymentError) throw new Error(paymentError.message);
    }
    // Google Sheet and backup-DB copies are refreshed by `mirrorSale`, which the
    // client calls after this returns, so the save never waits on them.
    return toDTO(row, initialPayment);
  });

export const updateSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), patch: SaleInput.partial() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const p = data.patch;
    const payload: TablesUpdate<"sales"> = {};
    if (p.productName !== undefined) payload.product_name = p.productName;
    if (p.durationMonths !== undefined) payload.duration_months = p.durationMonths;
    if (p.quantity !== undefined) (payload as any).quantity = p.quantity;
    if (p.buyerName !== undefined) payload.buyer_name = p.buyerName;
    if (p.customerName !== undefined) payload.customer_name = p.customerName;
    if (p.buyPrice !== undefined) payload.buy_price = p.buyPrice;
    if (p.sellPrice !== undefined) payload.sell_price = p.sellPrice;
    if (p.warrantyStart !== undefined) payload.warranty_start = p.warrantyStart;
    if (p.notes !== undefined) payload.notes = p.notes;
    if (p.customerNumber !== undefined) payload.customer_number = p.customerNumber;
    if (p.dealerNumber !== undefined) payload.dealer_number = p.dealerNumber;
    if (p.hasWarranty !== undefined) payload.has_warranty = p.hasWarranty;
    if (p.paymentStatus !== undefined) (payload as any).payment_status = p.paymentStatus;
    if (p.refundedAt !== undefined) (payload as any).refunded_at = p.refundedAt;
    if (p.refundAmount !== undefined) (payload as any).refund_amount = p.refundAmount;
    if (p.refundReason !== undefined) (payload as any).refund_reason = p.refundReason;
    const { data: row, error } = await supabase
      .from("sales")
      .update(payload)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toDTO(row);
  });

export const deleteSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("sales").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const isAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return { isAdmin: context.userId === process.env.ADMIN_USER_ID };
  });

export const backfillSalesToSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (context.userId !== process.env.ADMIN_USER_ID) {
      throw new Error("Forbidden");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { replaceUserSheet, resolveTabName } = await import("@/lib/sheets.server");
    const { data: rows, error } = await supabaseAdmin
      .from("sales")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const byUser = new Map<string, any[]>();
    for (const r of rows ?? []) {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r);
      byUser.set(r.user_id, arr);
    }
    let users = 0;
    let total = 0;
    for (const [userId, list] of byUser) {
      const tab = await resolveTabName(userId);
      await replaceUserSheet(tab, list);
      users++;
      total += list.length;
    }
    return { users, total };
  });
