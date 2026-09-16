-- Full database schema for this app: all files in supabase/migrations/ concatenated in order.
-- Run once in a fresh Supabase project (Dashboard > SQL Editor > paste > Run).
-- Generated from the migrations; regenerate with: cat supabase/migrations/*.sql

-- ===== 20260520040720_e8f0a05a-bc69-490f-b78c-febd773b6e7b.sql =====

CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_name text NOT NULL,
  duration_months integer NOT NULL CHECK (duration_months > 0),
  buyer_name text NOT NULL DEFAULT '',
  customer_name text NOT NULL DEFAULT '',
  buy_price numeric NOT NULL DEFAULT 0,
  sell_price numeric NOT NULL DEFAULT 0,
  warranty_start timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sales_user_id_idx ON public.sales(user_id);
CREATE INDEX sales_warranty_start_idx ON public.sales(warranty_start);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select own sales" ON public.sales
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "users insert own sales" ON public.sales
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own sales" ON public.sales
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users delete own sales" ON public.sales
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER sales_touch_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== 20260520040740_83cefe75-f716-4887-8d7b-d9f53af1eed7.sql =====

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ===== 20260520042523_6b65bfff-e229-4b33-9436-4e4222accbc9.sql =====
ALTER TABLE public.sales
  ADD COLUMN customer_number text,
  ADD COLUMN dealer_number text;
-- ===== 20260604111852_2b2a14bd-58a4-4613-ae0c-963cb9068f8f.sql =====
ALTER TABLE public.sales ADD COLUMN has_warranty boolean NOT NULL DEFAULT true;
-- ===== 20260608052106_ab4b96c4-9e24-4a68-8da8-ba93337e9670.sql =====
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'paid';
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_payment_status_check;
ALTER TABLE public.sales ADD CONSTRAINT sales_payment_status_check CHECK (payment_status IN ('paid','unpaid','partial'));
-- ===== 20260608072941_ecaad51d-1fe7-4173-9b77-f448f6f78f69.sql =====

-- Role enum
CREATE TYPE public.workspace_role AS ENUM ('owner', 'editor', 'viewer');

-- Workspaces
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE,
  name text NOT NULL DEFAULT 'My Shared Space',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Members
CREATE TABLE public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.workspace_role NOT NULL DEFAULT 'editor',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

-- Invites pending until invitee logs in
CREATE TABLE public.workspace_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.workspace_role NOT NULL DEFAULT 'editor',
  invited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, email)
);

-- Links
CREATE TABLE public.workspace_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  note text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_workspace_links_ws ON public.workspace_links(workspace_id);
CREATE INDEX idx_workspace_invites_email ON public.workspace_invites(lower(email));

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_invites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_links TO authenticated;
GRANT ALL ON public.workspaces, public.workspace_members, public.workspace_invites, public.workspace_links TO service_role;

-- RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_links ENABLE ROW LEVEL SECURITY;

-- Helper: is _user a member of _ws with at least _min_role
CREATE OR REPLACE FUNCTION public.is_workspace_member(_ws uuid, _user uuid, _min_role public.workspace_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _ws AND user_id = _user
      AND CASE _min_role
        WHEN 'viewer' THEN role IN ('viewer','editor','owner')
        WHEN 'editor' THEN role IN ('editor','owner')
        WHEN 'owner'  THEN role = 'owner'
      END
  );
$$;

-- workspaces policies
CREATE POLICY "members can read workspace" ON public.workspaces
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(id, auth.uid(), 'viewer'));

CREATE POLICY "user can create own workspace" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "owner can update workspace" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "owner can delete workspace" ON public.workspaces
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- workspace_members policies
CREATE POLICY "members can read members" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid(), 'viewer'));

-- allow self-insert (used by ensureMyWorkspace owner row, and claim invites uses service-side via security-definer fn)
CREATE POLICY "self insert own membership" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner can manage members" ON public.workspace_members
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid(), 'owner'))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid(), 'owner'));

-- workspace_invites: only owner of workspace
CREATE POLICY "owner manages invites" ON public.workspace_invites
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid(), 'owner'))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid(), 'owner'));

-- workspace_links
CREATE POLICY "members can read links" ON public.workspace_links
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid(), 'viewer'));

CREATE POLICY "editors can insert links" ON public.workspace_links
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid(), 'editor') AND created_by = auth.uid());

CREATE POLICY "editors can update links" ON public.workspace_links
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid(), 'editor'))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid(), 'editor'));

CREATE POLICY "editors can delete links" ON public.workspace_links
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid(), 'editor'));

-- updated_at triggers
CREATE TRIGGER trg_workspaces_updated BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_workspace_links_updated BEFORE UPDATE ON public.workspace_links
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== 20260608073409_a2f12e81-2050-4ada-80eb-f16328f0bb89.sql =====

DROP POLICY IF EXISTS "self insert own membership" ON public.workspace_members;

CREATE POLICY "invitee can read own invite" ON public.workspace_invites
  FOR SELECT TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email'));

-- ===== 20260611124031_1a1587cc-06c7-4ac9-992a-546d71410a11.sql =====
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
-- ===== 20260611133348_882ccbd3-a638-4fce-9076-577e20f3df88.sql =====
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 1 AND quantity <= 10000);
-- ===== 20260611170041_0458805b-3806-4242-8d17-1782f8daad2a.sql =====

CREATE TABLE public.sale_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  paid_at timestamptz NOT NULL DEFAULT now(),
  method text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sale_payments_sale_id_idx ON public.sale_payments(sale_id);
CREATE INDEX sale_payments_user_id_idx ON public.sale_payments(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_payments TO authenticated;
GRANT ALL ON public.sale_payments TO service_role;

ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select own payments" ON public.sale_payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own payments" ON public.sale_payments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own payments" ON public.sale_payments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own payments" ON public.sale_payments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER sale_payments_touch_updated_at
  BEFORE UPDATE ON public.sale_payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-sync sales.payment_status based on sum of payments vs sell_price
CREATE OR REPLACE FUNCTION public.sync_sale_payment_status(_sale_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_paid numeric;
  sell numeric;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM public.sale_payments WHERE sale_id = _sale_id;
  SELECT sell_price INTO sell FROM public.sales WHERE id = _sale_id;
  IF sell IS NULL THEN RETURN; END IF;
  UPDATE public.sales
    SET payment_status = CASE
      WHEN total_paid >= sell THEN 'paid'
      WHEN total_paid > 0 THEN 'partial'
      ELSE 'unpaid'
    END
    WHERE id = _sale_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sale_payments_after_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_sale_payment_status(OLD.sale_id);
    RETURN OLD;
  ELSE
    PERFORM public.sync_sale_payment_status(NEW.sale_id);
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER sale_payments_sync_status
  AFTER INSERT OR UPDATE OR DELETE ON public.sale_payments
  FOR EACH ROW EXECUTE FUNCTION public.sale_payments_after_change();

-- ===== 20260611170111_7714262c-e14a-4224-9046-e2d054a90890.sql =====

REVOKE EXECUTE ON FUNCTION public.sync_sale_payment_status(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sale_payments_after_change() FROM PUBLIC, anon, authenticated;

-- ===== 20260611171136_29a8673f-8b15-45bb-b96f-49a6246567dc.sql =====

CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('customer','dealer')),
  name_key text NOT NULL,
  display_name text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, name_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own contacts" ON public.contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own contacts" ON public.contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own contacts" ON public.contacts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own contacts" ON public.contacts FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER contacts_touch_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== 20260611171200_539b73fc-14a7-4658-9de9-5c66a16ffc21.sql =====
ALTER FUNCTION public.touch_updated_at() SECURITY INVOKER;
-- ===== 20260611171658_731620c4-7a17-41cf-8f6e-6b97e4e807a1.sql =====

DROP POLICY IF EXISTS "Users select own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users insert own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users update own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users delete own contacts" ON public.contacts;

CREATE POLICY "Users select own contacts" ON public.contacts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own contacts" ON public.contacts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own contacts" ON public.contacts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own contacts" ON public.contacts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== 20260716083302_1a56573e-334d-4a52-860c-93c6c8c3750c.sql =====
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_amount numeric,
  ADD COLUMN IF NOT EXISTS refund_reason text;

-- ===== 20260916090000_payment_status_uses_quantity.sql =====

-- payment_status must be derived from the *line total* (sell_price × quantity),
-- not the per-unit sell_price, and it must be re-derived when the sale's own
-- price or quantity changes, not only when a payment row changes.

-- 1. Payment-side sync: compare against the line total.
CREATE OR REPLACE FUNCTION public.sync_sale_payment_status(_sale_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_paid numeric;
  total numeric;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM public.sale_payments WHERE sale_id = _sale_id;
  SELECT sell_price * COALESCE(quantity, 1) INTO total
    FROM public.sales WHERE id = _sale_id;
  IF total IS NULL THEN RETURN; END IF;
  UPDATE public.sales
    SET payment_status = CASE
      WHEN total_paid >= total THEN 'paid'
      WHEN total_paid > 0 THEN 'partial'
      ELSE 'unpaid'
    END
    WHERE id = _sale_id;
END;
$$;

-- 2. Sale-side sync: when price, quantity or status is edited on a sale that
--    has recorded payments, the status is always what the payments say.
--    Sales with no payment rows keep whatever status was set by hand.
CREATE OR REPLACE FUNCTION public.sales_resync_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_paid numeric;
  n_payments integer;
BEGIN
  SELECT COALESCE(SUM(amount), 0), COUNT(*) INTO total_paid, n_payments
    FROM public.sale_payments WHERE sale_id = NEW.id;
  IF n_payments = 0 THEN
    RETURN NEW;
  END IF;
  NEW.payment_status := CASE
    WHEN total_paid >= NEW.sell_price * COALESCE(NEW.quantity, 1) THEN 'paid'
    WHEN total_paid > 0 THEN 'partial'
    ELSE 'unpaid'
  END;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sales_resync_payment_status() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sales_resync_payment_status ON public.sales;
CREATE TRIGGER sales_resync_payment_status
  BEFORE UPDATE OF sell_price, quantity, payment_status ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.sales_resync_payment_status();

-- 3. Backfill: repair every sale whose status was computed against the
--    per-unit price. Only sales that have payment rows are touched.
UPDATE public.sales s
SET payment_status = CASE
  WHEN p.paid >= s.sell_price * COALESCE(s.quantity, 1) THEN 'paid'
  WHEN p.paid > 0 THEN 'partial'
  ELSE 'unpaid'
END
FROM (
  SELECT sale_id, SUM(amount) AS paid
  FROM public.sale_payments
  GROUP BY sale_id
) p
WHERE p.sale_id = s.id
  AND s.payment_status <> CASE
    WHEN p.paid >= s.sell_price * COALESCE(s.quantity, 1) THEN 'paid'
    WHEN p.paid > 0 THEN 'partial'
    ELSE 'unpaid'
  END;
