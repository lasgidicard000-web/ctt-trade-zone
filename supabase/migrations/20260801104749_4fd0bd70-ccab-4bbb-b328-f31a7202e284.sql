REVOKE EXECUTE ON FUNCTION public.roll_investment_daily_roi() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.roll_investment_daily_roi() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_investment_roi_summary(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_investment_roi_summary(uuid) TO authenticated, service_role;

GRANT UPDATE ON public.investment_daily_roi TO authenticated;

CREATE POLICY "Admins update daily roi"
  ON public.investment_daily_roi FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
