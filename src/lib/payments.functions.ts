import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { paymentToDTO as toDTO, type PaymentDTO } from "@/lib/ledger-dto";

// Reads (payments for a sale) run in the browser: see src/lib/ledger-reads.ts.
export type { PaymentDTO };

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
    return toDTO(row);
  });

export const deletePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("sale_payments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
