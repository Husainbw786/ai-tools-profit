import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PaymentDTO = {
  id: string;
  saleId: string;
  amount: number;
  paidAt: string;
  method: string | null;
  note: string | null;
  createdAt: string;
};

const toDTO = (row: any): PaymentDTO => ({
  id: row.id,
  saleId: row.sale_id,
  amount: Number(row.amount),
  paidAt: row.paid_at,
  method: row.method ?? null,
  note: row.note ?? null,
  createdAt: row.created_at,
});

export const listPaymentsForSale = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ saleId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("sale_payments")
      .select("*")
      .eq("sale_id", data.saleId)
      .order("paid_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map(toDTO);
  });

export const createPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        saleId: z.string().uuid(),
        amount: z.number().positive().max(100_000_000),
        paidAt: z.string(),
        method: z.string().max(60).optional().nullable(),
        note: z.string().max(500).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("sale_payments")
      .insert({
        user_id: context.userId,
        sale_id: data.saleId,
        amount: data.amount,
        paid_at: data.paidAt,
        method: data.method ?? null,
        note: data.note ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const backup = await import("@/lib/backup.server");
    backup.withBackup(backup.upsertBackupPayment(row), "upsertBackupPayment");
    return toDTO(row);
  });

export const deletePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("sale_payments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    const backup = await import("@/lib/backup.server");
    backup.withBackup(backup.deleteBackupPayment(data.id), "deleteBackupPayment");
    return { ok: true };
  });
