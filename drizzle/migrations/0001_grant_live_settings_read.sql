REVOKE ALL ON FUNCTION public.live_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.live_settings() TO authenticated, service_role;