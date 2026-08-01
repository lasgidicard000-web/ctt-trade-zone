-- 1. ROI band on plan templates
ALTER TABLE public.plan_templates
  ADD COLUMN IF NOT EXISTS roi_min numeric,
  ADD COLUMN IF NOT EXISTS roi_max numeric;

UPDATE public.plan_templates
SET roi_min = round(GREATEST(0, daily_roi * 0.6)::numeric, 6),
    roi_max = round(LEAST(1, daily_roi * 1.4)::numeric, 6)
WHERE roi_min IS NULL OR roi_max IS NULL;

ALTER TABLE public.plan_templates
  ALTER COLUMN roi_min SET NOT NULL,
  ALTER COLUMN roi_max SET NOT NULL;

-- 2. Per-day rolled ROI
CREATE TABLE IF NOT EXISTS public.investment_daily_roi (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  investment_id uuid NOT NULL REFERENCES public.user_investments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  roi_date date NOT NULL,
  roi numeric NOT NULL,
  source text NOT NULL DEFAULT 'auto',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (investment_id, roi_date)
);

CREATE INDEX IF NOT EXISTS idx_investment_daily_roi_user ON public.investment_daily_roi(user_id, roi_date);

GRANT SELECT ON public.investment_daily_roi TO authenticated;
GRANT ALL ON public.investment_daily_roi TO service_role;

ALTER TABLE public.investment_daily_roi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own daily roi"
  ON public.investment_daily_roi FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_investment_daily_roi_updated_at
  BEFORE UPDATE ON public.investment_daily_roi
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Roll missing days for all active investments (idempotent)
CREATE OR REPLACE FUNCTION public.roll_investment_daily_roi()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _inserted integer := 0;
  r record;
  d date;
  _min numeric;
  _max numeric;
  _roi numeric;
BEGIN
  FOR r IN
    SELECT ui.id, ui.user_id, ui.started_at, ui.ends_at, ui.daily_roi,
           pt.roi_min, pt.roi_max
    FROM public.user_investments ui
    LEFT JOIN public.plan_templates pt ON pt.id = ui.template_id
    WHERE ui.status = 'active'
  LOOP
    _min := COALESCE(r.roi_min, GREATEST(0, r.daily_roi * 0.6));
    _max := COALESCE(r.roi_max, LEAST(1, r.daily_roi * 1.4));
    IF _max < _min THEN _max := _min; END IF;

    FOR d IN
      SELECT generate_series(
        (r.started_at AT TIME ZONE 'UTC')::date,
        LEAST(now(), r.ends_at)::date,
        interval '1 day'
      )::date
    LOOP
      _roi := round((_min + (random() * (_max - _min)))::numeric, 6);
      INSERT INTO public.investment_daily_roi(investment_id, user_id, roi_date, roi, source)
      VALUES (r.id, r.user_id, d, _roi, 'auto')
      ON CONFLICT (investment_id, roi_date) DO NOTHING;
      IF FOUND THEN _inserted := _inserted + 1; END IF;
    END LOOP;
  END LOOP;

  RETURN _inserted;
END;
$$;

-- 4. Summary helper
CREATE OR REPLACE FUNCTION public.get_investment_roi_summary(_investment_id uuid)
RETURNS TABLE(today_roi numeric, avg_roi numeric, days_counted integer, accrued numeric, roi_min numeric, roi_max numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _inv record;
BEGIN
  SELECT ui.*, pt.roi_min AS p_min, pt.roi_max AS p_max
  INTO _inv
  FROM public.user_investments ui
  LEFT JOIN public.plan_templates pt ON pt.id = ui.template_id
  WHERE ui.id = _investment_id;

  IF _inv.id IS NULL THEN RETURN; END IF;
  IF _inv.user_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    (SELECT r.roi FROM public.investment_daily_roi r
      WHERE r.investment_id = _investment_id AND r.roi_date = (now() AT TIME ZONE 'UTC')::date),
    COALESCE((SELECT avg(r.roi) FROM public.investment_daily_roi r WHERE r.investment_id = _investment_id), _inv.daily_roi),
    COALESCE((SELECT count(*)::int FROM public.investment_daily_roi r WHERE r.investment_id = _investment_id), 0),
    COALESCE((SELECT sum(r.roi) FROM public.investment_daily_roi r WHERE r.investment_id = _investment_id), 0) * _inv.amount,
    COALESCE(_inv.p_min, GREATEST(0, _inv.daily_roi * 0.6)),
    COALESCE(_inv.p_max, LEAST(1, _inv.daily_roi * 1.4));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_investment_roi_summary(uuid) TO authenticated;

-- 5. Regulator also moves the band
CREATE OR REPLACE FUNCTION public.regulate_daily_roi(_admin_id uuid, _mode text, _value numeric, _active_only boolean, _propagate boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _changes jsonb := '[]'::jsonb;
  _plans_updated int := 0;
  _investments_updated int := 0;
  _template_ids uuid[] := ARRAY[]::uuid[];
  r record;
  _new_roi numeric;
  _factor numeric;
  _new_min numeric;
  _new_max numeric;
BEGIN
  IF _admin_id IS NULL OR NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF _mode NOT IN ('delta', 'multiply', 'set') THEN
    RAISE EXCEPTION 'invalid mode: %', _mode;
  END IF;

  IF _mode = 'multiply' AND _value <= 0 THEN
    RAISE EXCEPTION 'multiplier must be positive';
  END IF;

  FOR r IN
    SELECT id, name, daily_roi, roi_min, roi_max
    FROM public.plan_templates
    WHERE (NOT _active_only) OR is_active = true
    ORDER BY sort_order, name
    FOR UPDATE
  LOOP
    IF _mode = 'delta' THEN
      _new_roi := r.daily_roi + (_value / 100.0);
    ELSIF _mode = 'multiply' THEN
      _new_roi := r.daily_roi * _value;
    ELSE
      _new_roi := _value / 100.0;
    END IF;

    _new_roi := round(_new_roi::numeric, 6);

    IF _new_roi < 0 OR _new_roi > 1 THEN
      RAISE EXCEPTION 'ROI out of range for plan %: % (must be 0-100%% per day)',
        r.name, _new_roi;
    END IF;

    IF _new_roi <> r.daily_roi THEN
      _factor := CASE WHEN r.daily_roi > 0 THEN _new_roi / r.daily_roi ELSE 1 END;
      IF r.daily_roi > 0 THEN
        _new_min := round(GREATEST(0, r.roi_min * _factor)::numeric, 6);
        _new_max := round(LEAST(1, r.roi_max * _factor)::numeric, 6);
      ELSE
        _new_min := round(GREATEST(0, _new_roi * 0.6)::numeric, 6);
        _new_max := round(LEAST(1, _new_roi * 1.4)::numeric, 6);
      END IF;

      UPDATE public.plan_templates
      SET daily_roi = _new_roi, roi_min = _new_min, roi_max = _new_max, updated_at = now()
      WHERE id = r.id;

      _plans_updated := _plans_updated + 1;
      _template_ids := _template_ids || r.id;
      _changes := _changes || jsonb_build_object(
        'id', r.id,
        'name', r.name,
        'oldRoi', r.daily_roi,
        'newRoi', _new_roi,
        'newRoiMin', _new_min,
        'newRoiMax', _new_max
      );
    END IF;
  END LOOP;

  IF _propagate AND array_length(_template_ids, 1) IS NOT NULL THEN
    FOR r IN
      SELECT id, daily_roi FROM public.plan_templates
      WHERE id = ANY(_template_ids)
    LOOP
      WITH updated AS (
        UPDATE public.user_investments
        SET daily_roi = r.daily_roi
        WHERE template_id = r.id
          AND status = 'active'
          AND daily_roi <> r.daily_roi
        RETURNING 1
      )
      SELECT _investments_updated + COALESCE(count(*), 0)
      INTO _investments_updated
      FROM updated;
    END LOOP;
  END IF;

  INSERT INTO public.roi_regulation_log(
    admin_user_id, mode, value, active_only, propagate,
    plans_updated, investments_updated, changes
  ) VALUES (
    _admin_id, _mode, _value, _active_only, _propagate,
    _plans_updated, _investments_updated, _changes
  );

  RETURN jsonb_build_object(
    'plansUpdated', _plans_updated,
    'investmentsUpdated', _investments_updated,
    'changes', _changes
  );
END;
$function$;
