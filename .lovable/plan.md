## Add a Ledger tab inside each shared workspace

Adds a simple "Ledger" feature to the existing Links workspace so you and an invited member (your brother) can track who owes whom. Each workspace has its own private ledger, and only members of that workspace can see/edit it — fully isolated from your sales/hisab data, just like Links already are.

### What you'll see in the UI

Inside any workspace (My Space or a Shared space), a new **Tabs switcher** at the top:
- **Links** (existing)
- **Ledger** (new)

The Ledger tab shows:
- A big **net balance card** at the top — e.g. "Brother owes you ₹2,500" or "You owe Brother ₹800", auto-computed from all entries.
- An **Add entry** button (editors/owners only) opening a dialog with:
  - Amount (₹)
  - Direction: **I paid / gave** vs **They paid / gave**
  - Type: **Entry** (normal) or **Settlement** (cash handed over to clear balance) — settlement rows render with a distinct style and a "Settled" badge.
  - Optional short note
- A reverse-chronological list of entries showing: amount, direction arrow, who added it, date, note, and (for editors) edit/delete.

Viewers can see the ledger and balance but can't add/edit.

### How the balance works

Net = sum of (entries where you paid) − sum of (entries where they paid), shown from the perspective of whoever is viewing. Settlements are included in the math but visually separated. With only 2 members it's a single number; if a workspace ever has 3+ members, the balance falls back to "per-pair" against the workspace owner (rare for your use case — your brother workspace is just 2 people).

### Technical notes

- **New table** `workspace_ledger_entries`: `id`, `workspace_id` (FK), `created_by` (uid), `payer_user_id` (uid — who paid/gave money), `amount_cents` (int, validated >0), `kind` (`entry` | `settlement`), `note` (text, ≤500), `entry_date` (date), `created_at`, `updated_at`.
- **RLS**, mirroring `workspace_links`:
  - SELECT: workspace members (`is_workspace_member(ws, uid, 'viewer')`)
  - INSERT/UPDATE/DELETE: editors+ (`is_workspace_member(ws, uid, 'editor')`), with `created_by = auth.uid()` check on insert.
  - GRANT `SELECT, INSERT, UPDATE, DELETE` to `authenticated`; `ALL` to `service_role`.
- **Server fns** in `src/lib/workspace.functions.ts` (reuse `requireSupabaseAuth` + role gating already in place):
  - `listLedger({ workspaceId })` → entries + members + computed net for caller
  - `addLedgerEntry({ workspaceId, amount, payerUserId, kind, note, entryDate })`
  - `updateLedgerEntry`, `deleteLedgerEntry`
  - Zod validation: amount 1–100,000,00 paise, note ≤500, kind enum, date ISO.
- **Frontend**: extend `src/routes/links.tsx` `WorkspaceView` to wrap content in `<Tabs>` (Links | Ledger). New `LedgerPanel` component + `LedgerEntryDialog`. Reuses existing shadcn `Tabs`, `Dialog`, `Select`, `Input`.
- No change to sales/hisab tables or routes — isolation preserved.

### Files

- New migration: `supabase/migrations/<ts>_workspace_ledger.sql`
- Edit: `src/lib/workspace.functions.ts` (add ledger fns + DTOs)
- Edit: `src/routes/links.tsx` (Tabs + LedgerPanel + LedgerEntryDialog)
- Edit: `src/integrations/supabase/types.ts` auto-regenerates after migration
