import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Role = "owner" | "editor" | "viewer";

export type WorkspaceDTO = { id: string; name: string; ownerId: string };
export type MemberDTO = { id: string; userId: string; email: string; role: Role };
export type InviteDTO = { id: string; email: string; role: Role };
export type LinkDTO = {
  id: string;
  title: string;
  url: string;
  note: string | null;
  createdBy: string;
  createdByEmail: string;
  createdAt: string;
};

export type LedgerKind = "entry" | "settlement";
export type LedgerEntryDTO = {
  id: string;
  amountCents: number;
  payerUserId: string;
  payerEmail: string;
  kind: LedgerKind;
  note: string | null;
  entryDate: string;
  createdBy: string;
  createdByEmail: string;
  createdAt: string;
};

async function lookupEmails(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const out: Record<string, string> = {};
  const unique = Array.from(new Set(userIds));
  await Promise.all(
    unique.map(async (id) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(id);
      out[id] = data.user?.email ?? "";
    }),
  );
  return out;
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Page through up to first 1000 users to find by email — small apps only.
  // (Supabase admin API lacks a direct email lookup.)
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 });
    if (error || !data) return null;
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (data.users.length < 100) return null;
  }
  return null;
}

async function ensureWorkspaceFor(userId: string, email: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: existing } = await supabaseAdmin
    .from("workspaces")
    .select("*")
    .eq("owner_id", userId)
    .maybeSingle();
  if (existing) return existing;
  const { data: ws, error } = await supabaseAdmin
    .from("workspaces")
    .insert({ owner_id: userId, name: `${email.split("@")[0] || "My"}'s space` })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  await supabaseAdmin
    .from("workspace_members")
    .insert({ workspace_id: ws.id, user_id: userId, role: "owner" });
  return ws;
}

async function claimInvitesFor(userId: string, email: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: invites } = await supabaseAdmin
    .from("workspace_invites")
    .select("*")
    .ilike("email", email);
  if (!invites || invites.length === 0) return;
  for (const inv of invites) {
    await supabaseAdmin
      .from("workspace_members")
      .upsert(
        { workspace_id: inv.workspace_id, user_id: userId, role: inv.role },
        { onConflict: "workspace_id,user_id" },
      );
    await supabaseAdmin.from("workspace_invites").delete().eq("id", inv.id);
  }
}

export const getWorkspaceHub = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const email = (claims.email as string) || "";
    await claimInvitesFor(userId, email);
    const myWs = await ensureWorkspaceFor(userId, email);
    const { data: memberships } = await supabase
      .from("workspace_members")
      .select("workspace_id, role, workspaces(id, name, owner_id)")
      .eq("user_id", userId);
    const shared = (memberships ?? [])
      .filter((m: any) => m.workspaces && m.workspaces.owner_id !== userId)
      .map((m: any) => ({
        id: m.workspaces.id as string,
        name: m.workspaces.name as string,
        ownerId: m.workspaces.owner_id as string,
        role: m.role as Role,
      }));
    return {
      myWorkspace: { id: myWs.id, name: myWs.name, ownerId: myWs.owner_id } as WorkspaceDTO,
      shared,
    };
  });

async function loadWorkspaceDetail(supabase: any, userId: string, wsId: string) {
  const { data: ws, error: wsErr } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", wsId)
    .single();
  if (wsErr || !ws) throw new Error("Workspace not found");

  const { data: members } = await supabase
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", wsId);
  const { data: links } = await supabase
    .from("workspace_links")
    .select("*")
    .eq("workspace_id", wsId)
    .order("created_at", { ascending: false });

  const myRow = (members ?? []).find((m: any) => m.user_id === userId);
  const myRole = (myRow?.role ?? null) as Role | null;

  let invites: any[] = [];
  if (myRole === "owner") {
    const { data } = await supabase
      .from("workspace_invites")
      .select("*")
      .eq("workspace_id", wsId);
    invites = data ?? [];
  }

  const userIds = Array.from(
    new Set([
      ...(members ?? []).map((m: any) => m.user_id),
      ...(links ?? []).map((l: any) => l.created_by),
    ]),
  );
  const emailMap = await lookupEmails(userIds);

  return {
    workspace: { id: ws.id, name: ws.name, ownerId: ws.owner_id } as WorkspaceDTO,
    myRole,
    members: (members ?? []).map((m: any) => ({
      id: m.id,
      userId: m.user_id,
      email: emailMap[m.user_id] ?? "",
      role: m.role as Role,
    })) as MemberDTO[],
    invites: invites.map((i: any) => ({
      id: i.id,
      email: i.email,
      role: i.role as Role,
    })) as InviteDTO[],
    links: (links ?? []).map((l: any) => ({
      id: l.id,
      title: l.title,
      url: l.url,
      note: l.note,
      createdBy: l.created_by,
      createdByEmail: emailMap[l.created_by] ?? "",
      createdAt: l.created_at,
    })) as LinkDTO[],
  };
}

export const getWorkspaceDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    return loadWorkspaceDetail(context.supabase, context.userId, data.workspaceId);
  });

const LinkInput = z.object({
  workspaceId: z.string().uuid(),
  title: z.string().min(1).max(200),
  url: z.string().url().max(2000),
  note: z.string().max(2000).optional().nullable(),
});

export const addLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => LinkInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("workspace_links").insert({
      workspace_id: data.workspaceId,
      title: data.title,
      url: data.url,
      note: data.note ?? null,
      created_by: userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().min(1).max(200),
        url: z.string().url().max(2000),
        note: z.string().max(2000).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("workspace_links")
      .update({ title: data.title, url: data.url, note: data.note ?? null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("workspace_links").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        email: z.string().email().max(255),
        role: z.enum(["editor", "viewer"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // verify caller is owner
    const { data: ws } = await supabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", data.workspaceId)
      .single();
    if (!ws || ws.owner_id !== userId) throw new Error("Only the owner can invite");

    const email = data.email.toLowerCase();
    const existingUserId = await findUserIdByEmail(email);
    if (existingUserId) {
      if (existingUserId === userId) throw new Error("You're already the owner");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin
        .from("workspace_members")
        .upsert(
          { workspace_id: data.workspaceId, user_id: existingUserId, role: data.role },
          { onConflict: "workspace_id,user_id" },
        );
      if (error) throw new Error(error.message);
      return { ok: true, status: "added" as const };
    }
    const { error: invErr } = await supabase
      .from("workspace_invites")
      .upsert(
        { workspace_id: data.workspaceId, email, role: data.role, invited_by: userId },
        { onConflict: "workspace_id,email" },
      );
    if (invErr) throw new Error(invErr.message);
    return { ok: true, status: "invited" as const };
  });

export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        memberId: z.string().uuid(),
        role: z.enum(["editor", "viewer"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("workspace_members")
      .update({ role: data.role })
      .eq("id", data.memberId)
      .neq("role", "owner");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ memberId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("workspace_members")
      .delete()
      .eq("id", data.memberId)
      .neq("role", "owner");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ inviteId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("workspace_invites")
      .delete()
      .eq("id", data.inviteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============= Ledger =============

const LedgerEntryInput = z.object({
  workspaceId: z.string().uuid(),
  amountCents: z.number().int().min(1).max(1_000_000_000),
  payerUserId: z.string().uuid(),
  kind: z.enum(["entry", "settlement"]),
  note: z.string().max(500).optional().nullable(),
  entryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const listLedger = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: entries, error } = await supabase
      .from("workspace_ledger_entries")
      .select("*")
      .eq("workspace_id", data.workspaceId)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = entries ?? [];
    const ids = Array.from(
      new Set([
        ...rows.map((r: any) => r.payer_user_id),
        ...rows.map((r: any) => r.created_by),
      ]),
    );
    const emailMap = await lookupEmails(ids);

    // Net balance from caller's perspective: + means others owe caller, - means caller owes.
    let net = 0;
    for (const r of rows as any[]) {
      if (r.payer_user_id === userId) net += r.amount_cents;
      else net -= r.amount_cents;
    }

    return {
      entries: rows.map((r: any) => ({
        id: r.id,
        amountCents: r.amount_cents,
        payerUserId: r.payer_user_id,
        payerEmail: emailMap[r.payer_user_id] ?? "",
        kind: r.kind as LedgerKind,
        note: r.note,
        entryDate: r.entry_date,
        createdBy: r.created_by,
        createdByEmail: emailMap[r.created_by] ?? "",
        createdAt: r.created_at,
      })) as LedgerEntryDTO[],
      netCents: net,
      viewerUserId: userId,
    };
  });

export const addLedgerEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => LedgerEntryInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("workspace_ledger_entries").insert({
      workspace_id: data.workspaceId,
      created_by: context.userId,
      payer_user_id: data.payerUserId,
      amount_cents: data.amountCents,
      kind: data.kind,
      note: data.note ?? null,
      entry_date: data.entryDate ?? new Date().toISOString().slice(0, 10),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateLedgerEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        amountCents: z.number().int().min(1).max(1_000_000_000),
        payerUserId: z.string().uuid(),
        kind: z.enum(["entry", "settlement"]),
        note: z.string().max(500).optional().nullable(),
        entryDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("workspace_ledger_entries")
      .update({
        amount_cents: data.amountCents,
        payer_user_id: data.payerUserId,
        kind: data.kind,
        note: data.note ?? null,
        ...(data.entryDate ? { entry_date: data.entryDate } : {}),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteLedgerEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("workspace_ledger_entries")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });