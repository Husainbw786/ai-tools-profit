-- Fix: payment status was derived against the per-unit sell_price instead of
-- the billed total (sell_price × quantity). A sale of 3 × ₹500 with ₹500 paid
-- was marked 'paid'. Also keep the status in sync when the sale's price or
-- quantity is edited after payments were recorded.

CREATE OR REPLACE FUNCTION public.sync_sale_payment_status(_sale_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_paid numeric;
  billed numeric;
  new_status text;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM public.sale_payments WHERE sale_id = _sale_id;
  SELECT sell_price * COALESCE(quantity, 1) INTO billed
    FROM public.sales WHERE id = _sale_id;
  IF billed IS NULL THEN RETURN; END IF;
  new_status := CASE
    WHEN total_paid >= billed THEN 'paid'
    WHEN total_paid > 0 THEN 'partial'
    ELSE 'unpaid'
  END;
  -- Only write when it actually changes, so updated_at isn't bumped needlessly.
  UPDATE public.sales
    SET payment_status = new_status
    WHERE id = _sale_id AND payment_status IS DISTINCT FROM new_status;
END;
$$;

-- When a sale that has recorded payments is edited (price, quantity, or a
-- manual status change), re-derive the status from its payments so it can't
-- drift. Sales without any payment rows (recorded before payment tracking)
-- keep whatever status the user set manually.
CREATE OR REPLACE FUNCTION public.sales_before_update_sync_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_paid numeric;
  billed numeric;
BEGIN
  IF NEW.sell_price IS DISTINCT FROM OLD.sell_price
     OR NEW.quantity IS DISTINCT FROM OLD.quantity
     OR NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    IF EXISTS (SELECT 1 FROM public.sale_payments WHERE sale_id = NEW.id) THEN
      SELECT COALESCE(SUM(amount), 0) INTO total_paid
        FROM public.sale_payments WHERE sale_id = NEW.id;
      billed := NEW.sell_price * COALESCE(NEW.quantity, 1);
      NEW.payment_status := CASE
        WHEN total_paid >= billed THEN 'paid'
        WHEN total_paid > 0 THEN 'partial'
        ELSE 'unpaid'
      END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sales_before_update_sync_status() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sales_sync_payment_status ON public.sales;
CREATE TRIGGER sales_sync_payment_status
  BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.sales_before_update_sync_status();

-- Re-derive the status of every sale that has payments, so rows mis-marked by
-- the old per-unit comparison are corrected.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT DISTINCT sale_id FROM public.sale_payments LOOP
    PERFORM public.sync_sale_payment_status(r.sale_id);
  END LOOP;
END;
$$;
