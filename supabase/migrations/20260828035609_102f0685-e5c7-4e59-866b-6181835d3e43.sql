
REVOKE EXECUTE ON FUNCTION public.demo_price(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.demo_price(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.demo_get_account() FROM anon;
REVOKE EXECUTE ON FUNCTION public.demo_reset_account() FROM anon;
REVOKE EXECUTE ON FUNCTION public.demo_place_order(text, text, text, text, numeric, numeric, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.demo_cancel_order(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.demo_close_position(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.demo_engine_tick() FROM anon;
REVOKE EXECUTE ON FUNCTION public.bot_create(text, text, text, numeric, numeric, numeric, integer, integer, integer, numeric, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bot_set_status(uuid, text) FROM anon;
