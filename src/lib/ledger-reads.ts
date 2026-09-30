/*
 * Ledger reads, straight from the browser to Supabase.
 *
 * Reads used to go browser → serverless function → Supabase. Row Level
 * Security on `sales`, `sale_payments` and `contacts` (auth.uid() = user_id)
 * already scopes every row to the signed-in user, so the browser can query
 * them directly and skip the function hop and its cold start entirely.
 *
 * Writes stay as server functions (src/lib/*.functions.ts): they validate
 * input and fan out to the Google Sheet mirror and the backup database.
 */
import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { contactToDTO, paidBySaleMap, paymentToDTO, saleToDTO } from "@/lib/ledger-dto";
import type { ContactDTO, PaymentDTO, SaleDTO } from "@/lib/ledger-dto";

/**
 * PostgREST reports an expired or invalid token as a JWT error; rewording it
 * lets `friendlyError` show the existing "sign in again" message.
 */
function toError(error: PostgrestError): Error {
  const message = error.message || "Request failed";
  if (error.code === "PGRST301" || /jwt|token/i.test(message)) {
    return new Error(`Unauthorized: ${message}`);
  }
  return new Error(message);
}

export async function fetchSales(signal?: AbortSignal): Promise<SaleDTO[]> {
  let sales = supabase.from("sales").select("*").order("warranty_start", { ascending: false });
  let pays = supabase.from("sale_payments").select("sale_id, amount");
  if (signal) {
    sales = sales.abortSignal(signal);
    pays = pays.abortSignal(signal);
  }
  const [{ data, error }, { data: payRows, error: payErr }] = await Promise.all([sales, pays]);
  if (error) throw toError(error);
  if (payErr) throw toError(payErr);
  const paidBySale = paidBySaleMap(payRows ?? []);
  return (data ?? []).map((r) => saleToDTO(r, paidBySale.get(r.id) ?? 0));
}

export async function fetchContacts(signal?: AbortSignal): Promise<ContactDTO[]> {
  let q = supabase.from("contacts").select("*");
  if (signal) q = q.abortSignal(signal);
  const { data, error } = await q;
  if (error) throw toError(error);
  return (data ?? []).map(contactToDTO);
}

export async function fetchPaymentsForSale(
  saleId: string,
  signal?: AbortSignal,
): Promise<PaymentDTO[]> {
  let q = supabase
    .from("sale_payments")
    .select("*")
    .eq("sale_id", saleId)
    .order("paid_at", { ascending: false });
  if (signal) q = q.abortSignal(signal);
  const { data, error } = await q;
  if (error) throw toError(error);
  return (data ?? []).map(paymentToDTO);
}
