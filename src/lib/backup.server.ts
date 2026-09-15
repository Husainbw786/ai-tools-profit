import { createClient } from "@supabase/supabase-js";

function createBackupClient() {
  const url = process.env["BACKUP_SUPABASE_URL"];
  const key = process.env["BACKUP_SUPABASE_SERVICE_KEY"];
  if (!url || !key) {
    console.warn("[backup] BACKUP_SUPABASE_URL or BACKUP_SUPABASE_SERVICE_KEY not set");
    return null;
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storage: undefined,
    },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        // New-format sb_ keys are opaque, not JWTs. Supabase's default fetch
        // sends them as Authorization: Bearer <key>, which PostgREST rejects.
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

let _backupClient: ReturnType<typeof createBackupClient> | undefined;
function getBackupClient() {
  if (_backupClient === undefined) _backupClient = createBackupClient();
  return _backupClient;
}

function logWarning(label: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.warn(`[backup] ${label} failed:`, message);
}

export async function upsertBackupSale(row: any, amountPaid = 0) {
  const client = getBackupClient();
  if (!client) return;
  const payload = {
    id: row.id,
    user_id: row.user_id,
    product_name: row.product_name,
    duration_months: row.duration_months,
    quantity: row.quantity ?? 1,
    buyer_name: row.buyer_name ?? "",
    customer_name: row.customer_name ?? "",
    customer_number: row.customer_number ?? null,
    dealer_number: row.dealer_number ?? null,
    buy_price: row.buy_price,
    sell_price: row.sell_price,
    warranty_start: row.warranty_start,
    notes: row.notes ?? null,
    has_warranty: row.has_warranty ?? true,
    payment_status: row.payment_status ?? "paid",
    amount_paid: amountPaid,
    refunded_at: row.refunded_at ?? null,
    refund_amount: row.refund_amount ?? null,
    refund_reason: row.refund_reason ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  const { error } = await client.from("sales_backup").upsert(payload, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

export async function deleteBackupSale(id: string) {
  const client = getBackupClient();
  if (!client) return;
  const { error } = await client.from("sales_backup").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function upsertBackupPayment(row: any) {
  const client = getBackupClient();
  if (!client) return;
  const payload = {
    id: row.id,
    user_id: row.user_id,
    sale_id: row.sale_id,
    amount: row.amount,
    paid_at: row.paid_at,
    method: row.method ?? null,
    note: row.note ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  const { error } = await client.from("sale_payments_backup").upsert(payload, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

export async function deleteBackupPayment(id: string) {
  const client = getBackupClient();
  if (!client) return;
  const { error } = await client.from("sale_payments_backup").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function upsertBackupContact(row: any) {
  const client = getBackupClient();
  if (!client) return;
  const payload = {
    id: row.id,
    user_id: row.user_id,
    kind: row.kind,
    name_key: row.name_key,
    display_name: row.display_name,
    tags: row.tags ?? [],
    notes: row.notes ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  const { error } = await client.from("contacts_backup").upsert(payload, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

export async function deleteBackupContact(id: string) {
  const client = getBackupClient();
  if (!client) return;
  const { error } = await client.from("contacts_backup").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export function withBackup<T>(promise: Promise<T>, label: string) {
  promise.catch((err) => logWarning(label, err));
  return promise;
}
