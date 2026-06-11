
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
