
REVOKE EXECUTE ON FUNCTION public.sync_sale_payment_status(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sale_payments_after_change() FROM PUBLIC, anon, authenticated;
