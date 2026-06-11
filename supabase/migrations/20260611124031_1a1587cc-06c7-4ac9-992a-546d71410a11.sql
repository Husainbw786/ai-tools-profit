CREATE TABLE public.workspace_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  payer_user_id uuid NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0 AND amount_cents <= 1000000000),
  kind text NOT NULL CHECK (kind IN ('entry','settlement')),
  note text CHECK (note IS NULL OR char_length(note) <= 500),
  entry_date date NOT NULL DEFAULT (now()::date),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX workspace_ledger_entries_ws_idx ON public.workspace_ledger_entries(workspace_id, entry_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_ledger_entries TO authenticated;
GRANT ALL ON public.workspace_ledger_entries TO service_role;

ALTER TABLE public.workspace_ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can read ledger"
  ON public.workspace_ledger_entries FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid(), 'viewer'));

CREATE POLICY "editors can insert ledger"
  ON public.workspace_ledger_entries FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid(), 'editor')
    AND created_by = auth.uid()
    AND public.is_workspace_member(workspace_id, payer_user_id, 'viewer')
  );

CREATE POLICY "editors can update ledger"
  ON public.workspace_ledger_entries FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid(), 'editor'))
  WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid(), 'editor')
    AND public.is_workspace_member(workspace_id, payer_user_id, 'viewer')
  );

CREATE POLICY "editors can delete ledger"
  ON public.workspace_ledger_entries FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid(), 'editor'));

CREATE TRIGGER workspace_ledger_entries_touch
  BEFORE UPDATE ON public.workspace_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();