REVOKE ALL ON FUNCTION public.get_my_card() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.issue_virtual_card() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_card_details(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_card_pin(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_card_status(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.card_spend(uuid, text, numeric) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_my_card() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.issue_virtual_card() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_card_details(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_card_pin(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_card_status(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.card_spend(uuid, text, numeric) TO authenticated, service_role;