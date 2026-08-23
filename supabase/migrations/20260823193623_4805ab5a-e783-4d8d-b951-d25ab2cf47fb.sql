CREATE OR REPLACE FUNCTION public.validate_user_investment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tpl public.plan_templates;
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You can only create investments for your own account';
  END IF;

  IF NEW.template_id IS NULL THEN
    RAISE EXCEPTION 'An investment must reference an active plan template';
  END IF;

  SELECT * INTO tpl FROM public.plan_templates WHERE id = NEW.template_id AND is_active = true;
  IF tpl.id IS NULL THEN
    RAISE EXCEPTION 'Plan template not found or inactive';
  END IF;

  IF NEW.amount IS NULL OR NEW.amount < tpl.principal_min
     OR (tpl.principal_max IS NOT NULL AND NEW.amount > tpl.principal_max) THEN
    RAISE EXCEPTION 'Investment amount is outside the allowed range for this plan';
  END IF;

  NEW.plan_name := tpl.name;
  NEW.plan_id := split_part(lower(trim(tpl.name)), ' ', 1);
  NEW.daily_roi := tpl.daily_roi;
  NEW.duration_days := tpl.duration_days;
  NEW.status := COALESCE(NULLIF(NEW.status, ''), 'active');
  IF NEW.status NOT IN ('active', 'pending') THEN
    RAISE EXCEPTION 'Invalid initial investment status';
  END IF;
  NEW.started_at := COALESCE(NEW.started_at, now());
  NEW.ends_at := NEW.started_at + (tpl.duration_days || ' days')::interval;

  RETURN NEW;
END;
$$;