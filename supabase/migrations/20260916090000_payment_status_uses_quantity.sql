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
