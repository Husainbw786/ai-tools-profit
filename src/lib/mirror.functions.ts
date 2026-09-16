import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/*
 * Secondary copies of the ledger (Google Sheet, backup Supabase project) are
 * refreshed here, in their own server-function invocation that the client fires
 * after a write has succeeded. The primary writes therefore return as soon as
 * Postgres has committed, and a slow or misconfigured mirror can never freeze
 * the UI or fail a save that already happened. Everything below is best-effort.
 */

const warn = (label: string, err: unknown) =>
  console.warn(`[mirror] ${label}:`, err instanceof Error ? err.message : String(err));

async function tabFor(userId: string): Promise<string> {
  try {
    const { resolveTabName } = await import("@/lib/sheets.server");
    return await resolveTabName(userId);
  } catch (e) {
    warn("resolveTabName", e);
    return userId;
  }
}

export const mirrorSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ saleId: z.string().uuid(), action: z.enum(["upsert", "delete"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    try {
      const [sheets, backup] = await Promise.all([
        import("@/lib/sheets.server"),
        import("@/lib/backup.server"),
      ]);

      if (data.action === "delete") {
        await Promise.allSettled([
          tabFor(userId).then((tab) => sheets.deleteSaleRow(tab, data.saleId)),
          backup.deleteBackupSale(data.saleId).catch((e) => warn("deleteBackupSale", e)),
        ]);
        return { ok: true };
      }

      const [{ data: row }, { data: payments }] = await Promise.all([
        supabase.from("sales").select("*").eq("id", data.saleId).maybeSingle(),
        supabase.from("sale_payments").select("*").eq("sale_id", data.saleId),
      ]);
      if (!row) return { ok: false };

      const amountPaid = (payments ?? []).reduce((a, p) => a + Number(p.amount), 0);
      await Promise.allSettled([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tabFor(userId).then((tab) => sheets.upsertSaleRow(tab, row as any, amountPaid)),
        backup.upsertBackupSale(row, amountPaid).catch((e) => warn("upsertBackupSale", e)),
        ...(payments ?? []).map((p) =>
          backup.upsertBackupPayment(p).catch((e) => warn("upsertBackupPayment", e)),
        ),
      ]);
      return { ok: true };
    } catch (e) {
      warn("mirrorSale", e);
      return { ok: false };
    }
  });

export const mirrorPaymentDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    try {
      const backup = await import("@/lib/backup.server");
      await backup.deleteBackupPayment(data.id);
      return { ok: true };
    } catch (e) {
      warn("deleteBackupPayment", e);
      return { ok: false };
    }
  });

export const mirrorContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    try {
      const { data: row } = await context.supabase
        .from("contacts")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();
      if (!row) return { ok: false };
      const backup = await import("@/lib/backup.server");
      await backup.upsertBackupContact(row);
      return { ok: true };
    } catch (e) {
      warn("upsertBackupContact", e);
      return { ok: false };
    }
  });
