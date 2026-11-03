import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAdminEmail } from "@/lib/admin";
import {
  contactToDTO,
  paidBySaleMap,
  paymentToDTO,
  saleToDTO,
  type ContactDTO,
  type PaymentDTO,
  type SaleDTO,
} from "@/lib/ledger-dto";

export type AdminUserDTO = {
  id: string;
  email: string;
  name: string | null;
  provider: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  salesCount: number;
};

export type AdminUserDetailDTO = {
  user: AdminUserDTO;
  sales: SaleDTO[];
  payments: PaymentDTO[];
  contacts: ContactDTO[];
};

/**
 * Server-side gate. The browser hides the Admin entry for everyone else, but
 * this is what actually protects the data: the email is re-read from Supabase
 * Auth (not trusted from the client) and must be confirmed.
 */
async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  const u = data?.user;
  if (error || !u || !isAdminEmail(u.email) || !u.email_confirmed_at) {
    throw new Error("Forbidden: admin only");
  }
  return supabaseAdmin;
}

type AuthUser = {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

const toUserDTO = (u: AuthUser, salesCount: number): AdminUserDTO => ({
  id: u.id,
  email: u.email ?? "",
  name:
    (u.user_metadata?.full_name as string | undefined) ??
    (u.user_metadata?.name as string | undefined) ??
    null,
  provider: (u.app_metadata?.provider as string | undefined) ?? null,
  createdAt: u.created_at,
  lastSignInAt: u.last_sign_in_at ?? null,
  salesCount,
});

/** Fetches every row of a table column, paging past PostgREST's row cap. */
async function selectAllUserIds(
  admin: Awaited<ReturnType<typeof assertAdmin>>,
  table: "sales",
): Promise<string[]> {
  const out: string[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from(table)
      .select("user_id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    for (const r of data ?? []) out.push(r.user_id);
    if (!data || data.length < PAGE) break;
  }
  return out;
}

export const listPlatformUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context.userId);

    const users: AuthUser[] = [];
    for (let page = 1; page <= 100; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(error.message);
      users.push(...(data.users as AuthUser[]));
      if (data.users.length < 1000) break;
    }

    const counts = new Map<string, number>();
    for (const id of await selectAllUserIds(admin, "sales")) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }

    return users
      .map((u) => toUserDTO(u, counts.get(u.id) ?? 0))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

export const getPlatformUserData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<AdminUserDetailDTO> => {
    const admin = await assertAdmin(context.userId);

    const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(data.userId);
    if (userErr || !userRes?.user) throw new Error("User not found");

    const [salesRes, paysRes, contactsRes] = await Promise.all([
      admin
        .from("sales")
        .select("*")
        .eq("user_id", data.userId)
        .order("warranty_start", { ascending: false }),
      admin
        .from("sale_payments")
        .select("*")
        .eq("user_id", data.userId)
        .order("paid_at", { ascending: false }),
      admin.from("contacts").select("*").eq("user_id", data.userId),
    ]);
    if (salesRes.error) throw new Error(salesRes.error.message);
    if (paysRes.error) throw new Error(paysRes.error.message);
    if (contactsRes.error) throw new Error(contactsRes.error.message);

    const payRows = paysRes.data ?? [];
    const paidBySale = paidBySaleMap(payRows);
    const sales = (salesRes.data ?? []).map((r) => saleToDTO(r, paidBySale.get(r.id) ?? 0));

    return {
      user: toUserDTO(userRes.user as AuthUser, sales.length),
      sales,
      payments: payRows.map(paymentToDTO),
      contacts: (contactsRes.data ?? []).map(contactToDTO),
    };
  });
