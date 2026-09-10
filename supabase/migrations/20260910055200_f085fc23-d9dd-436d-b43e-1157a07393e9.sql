REVOKE EXECUTE ON FUNCTION public.card_request_funding(uuid, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_credit_card_funding(uuid, boolean, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_card() FROM anon;
REVOKE EXECUTE ON FUNCTION public.card_spend(uuid, text, numeric) FROM anon;