import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { contactToDTO as toDTO, type ContactDTO } from "@/lib/ledger-dto";

// Reads (the contacts list) run in the browser: see src/lib/ledger-reads.ts.
export type { ContactDTO };

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
    return toDTO(row);
  });
