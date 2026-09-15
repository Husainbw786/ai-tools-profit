import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ContactDTO = {
  id: string;
  kind: "customer" | "dealer";
  nameKey: string;
  displayName: string;
  tags: string[];
  notes: string | null;
};

const toDTO = (r: any): ContactDTO => ({
  id: r.id,
  kind: r.kind,
  nameKey: r.name_key,
  displayName: r.display_name,
  tags: r.tags ?? [],
  notes: r.notes ?? null,
});

export const listContacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.from("contacts").select("*");
    if (error) throw new Error(error.message);
    return (data ?? []).map(toDTO);
  });

const UpsertInput = z.object({
  kind: z.enum(["customer", "dealer"]),
  displayName: z.string().min(1).max(200),
  tags: z.array(z.string().min(1).max(40)).max(20).default([]),
  notes: z.string().max(4000).nullable().optional(),
});

export const upsertContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpsertInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const nameKey = data.displayName.trim().toLowerCase();
    const { data: row, error } = await supabase
      .from("contacts")
      .upsert(
        {
          user_id: userId,
          kind: data.kind,
          name_key: nameKey,
          display_name: data.displayName.trim(),
          tags: data.tags,
          notes: data.notes ?? null,
        },
        { onConflict: "user_id,kind,name_key" },
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const backup = await import("@/lib/backup.server");
    backup.withBackup(backup.upsertBackupContact(row), "upsertBackupContact");
    return toDTO(row);
  });
