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
  createdAt: string;
};

const toDTO = (row: any): SaleDTO => ({
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
  createdAt: row.created_at,
});

export const listSales = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .order("warranty_start", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toDTO);
  });

export const createSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaleInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
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
    const { appendSaleRow, resolveTabName } = await import("@/lib/sheets.server");
    const tab = await resolveTabName(userId);
    await appendSaleRow(tab, row as any);
    return toDTO(row);
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
    const { data: row, error } = await supabase
      .from("sales")
      .update(payload)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const { upsertSaleRow, resolveTabName } = await import("@/lib/sheets.server");
    const tab = await resolveTabName((row as any).user_id);
    await upsertSaleRow(tab, row as any);
    return toDTO(row);
  });

export const deleteSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: existing } = await supabase
      .from("sales")
      .select("user_id")
      .eq("id", data.id)
      .single();
    const { error } = await supabase.from("sales").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (existing?.user_id) {
      const { deleteSaleRow, resolveTabName } = await import("@/lib/sheets.server");
      const tab = await resolveTabName(existing.user_id);
      await deleteSaleRow(tab, data.id);
    }
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