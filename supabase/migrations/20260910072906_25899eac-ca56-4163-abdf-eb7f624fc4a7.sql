REVOKE ALL ON FUNCTION public.merchant_request_payment(uuid, text, text, numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_decide_merchant_payment(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merchant_request_payment(uuid, text, text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_decide_merchant_payment(uuid, boolean, text) TO authenticated;