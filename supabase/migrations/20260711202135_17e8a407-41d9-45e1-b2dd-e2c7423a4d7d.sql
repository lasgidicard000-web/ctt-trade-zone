
CREATE TABLE public.plan_entitlements (
  plan_id text PRIMARY KEY,
  plan_name text NOT NULL,
  tier_rank int NOT NULL,
  withdrawal_fee_pct numeric NOT NULL DEFAULT 0.01,
  daily_withdrawal_cap numeric NOT NULL DEFAULT 2000,
  priority_support boolean NOT NULL DEFAULT false,
  premium_features boolean NOT NULL DEFAULT false,
  community_access boolean NOT NULL DEFAULT false,
  badge_color text NOT NULL DEFAULT 'muted',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plan_entitlements TO anon, authenticated;
GRANT ALL ON public.plan_entitlements TO service_role;

ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view plan entitlements"
  ON public.plan_entitlements FOR SELECT
  USING (true);

CREATE TRIGGER update_plan_entitlements_updated_at
  BEFORE UPDATE ON public.plan_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.plan_entitlements
  (plan_id, plan_name, tier_rank, withdrawal_fee_pct, daily_withdrawal_cap, priority_support, premium_features, community_access, badge_color)
VALUES
  ('none',           'No Active Plan',      0, 0.010,  2000,   false, false, false, 'muted'),
  ('recruit',        'Recruit Plan',        1, 0.010,  5000,   false, false, false, 'amber'),
  ('inspectors',     'Inspectors Plan',     2, 0.005,  15000,  true,  true,  true,  'slate'),
  ('superintendent', 'Superintendent Plan', 3, 0.004,  30000,  true,  true,  true,  'yellow'),
  ('commissioners',  'Commissioners Plan',  4, 0.003,  75000,  true,  true,  true,  'cyan'),
  ('general',        'General Plan',        5, 0.0025, 250000, true,  true,  true,  'purple');

CREATE OR REPLACE FUNCTION public.get_user_entitlements(_user_id uuid)
RETURNS public.plan_entitlements
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.plan_entitlements;
BEGIN
  SELECT pe.* INTO _row
  FROM public.user_investments ui
  JOIN public.plan_entitlements pe ON pe.plan_id = ui.plan_id
  WHERE ui.user_id = _user_id
    AND ui.status = 'active'
    AND ui.ends_at > now()
  ORDER BY pe.tier_rank DESC
  LIMIT 1;

  IF _row.plan_id IS NULL THEN
    SELECT * INTO _row FROM public.plan_entitlements WHERE plan_id = 'none';
  END IF;

  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_active_plan(_user_id uuid, _plan_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_investments ui
    JOIN public.plan_entitlements pe ON pe.plan_id = ui.plan_id
    JOIN public.plan_entitlements req ON req.plan_id = _plan_id
    WHERE ui.user_id = _user_id
      AND ui.status = 'active'
      AND ui.ends_at > now()
      AND pe.tier_rank >= req.tier_rank
  )
$$;

GRANT EXECUTE ON FUNCTION public.get_user_entitlements(uuid) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.has_active_plan(uuid, text) TO authenticated, service_role, anon;
