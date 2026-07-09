
-- Audit log table
CREATE TABLE public.roi_regulation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  mode text NOT NULL,
  value numeric NOT NULL,
  active_only boolean NOT NULL,
  propagate boolean NOT NULL,
  plans_updated integer NOT NULL,
  investments_updated integer NOT NULL,
  changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.roi_regulation_log TO authenticated;
GRANT ALL ON public.roi_regulation_log TO service_role;

ALTER TABLE public.roi_regulation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view ROI regulation log"
ON public.roi_regulation_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Atomic regulation function
CREATE OR REPLACE FUNCTION public.regulate_daily_roi(
  _mode text,
  _value numeric,
  _active_only boolean,
  _propagate boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _changes jsonb := '[]'::jsonb;
  _plans_updated int := 0;
  _investments_updated int := 0;
  _template_ids uuid[] := ARRAY[]::uuid[];
  r record;
  _new_roi numeric;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF _mode NOT IN ('delta', 'multiply', 'set') THEN
    RAISE EXCEPTION 'invalid mode: %', _mode;
  END IF;

  IF _mode = 'multiply' AND _value <= 0 THEN
    RAISE EXCEPTION 'multiplier must be positive';
  END IF;

  -- Iterate scoped plans, compute + validate + update
  FOR r IN
    SELECT id, name, daily_roi
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

    -- Clamp precision to avoid float noise
    _new_roi := round(_new_roi::numeric, 6);

    IF _new_roi < 0 OR _new_roi > 1 THEN
      RAISE EXCEPTION 'ROI out of range for plan %: % (must be 0-100%% per day)',
        r.name, _new_roi;
    END IF;

    IF _new_roi <> r.daily_roi THEN
      UPDATE public.plan_templates
      SET daily_roi = _new_roi, updated_at = now()
      WHERE id = r.id;

      _plans_updated := _plans_updated + 1;
      _template_ids := _template_ids || r.id;
      _changes := _changes || jsonb_build_object(
        'id', r.id,
        'name', r.name,
        'oldRoi', r.daily_roi,
        'newRoi', _new_roi
      );
    END IF;
  END LOOP;

  -- Propagate to active user investments per changed template
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
    _uid, _mode, _value, _active_only, _propagate,
    _plans_updated, _investments_updated, _changes
  );

  RETURN jsonb_build_object(
    'plansUpdated', _plans_updated,
    'investmentsUpdated', _investments_updated,
    'changes', _changes
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.regulate_daily_roi(text, numeric, boolean, boolean) TO authenticated;
