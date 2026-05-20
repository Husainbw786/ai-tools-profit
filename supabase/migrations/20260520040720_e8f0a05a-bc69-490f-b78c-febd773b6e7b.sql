
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
