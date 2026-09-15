import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  upsertBackupSale,
  upsertBackupPayment,
  upsertBackupContact,
  withBackup,
} from "@/lib/backup.server";

export const backfillMyBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: sales }, { data: payments }, { data: contacts }] =
      await Promise.all([
        supabase.from("sales").select("*").eq("user_id", userId),
        supabase.from("sale_payments").select("*").eq("user_id", userId),
        supabase.from("contacts").select("*").eq("user_id", userId),
      ]);

    const paidBySale = new Map<string, number>();
    for (const p of payments ?? []) {
      paidBySale.set(p.sale_id, (paidBySale.get(p.sale_id) ?? 0) + Number(p.amount));
    }

    let saleCount = 0;
    for (const s of sales ?? []) {
      await withBackup(
        upsertBackupSale(s, paidBySale.get(s.id) ?? 0),
        `backfill sale ${s.id}`,
      );
      saleCount++;
    }

    let paymentCount = 0;
    for (const p of payments ?? []) {
      await withBackup(upsertBackupPayment(p), `backfill payment ${p.id}`);
      paymentCount++;
    }

    let contactCount = 0;
    for (const c of contacts ?? []) {
      await withBackup(upsertBackupContact(c), `backfill contact ${c.id}`);
      contactCount++;
    }

    return { saleCount, paymentCount, contactCount };
  });
