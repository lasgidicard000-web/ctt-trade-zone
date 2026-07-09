-- Plan templates
CREATE TABLE public.plan_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  coin text NOT NULL DEFAULT 'USDT',
  principal_min numeric NOT NULL DEFAULT 0,
  principal_max numeric NOT NULL DEFAULT 0,
  daily_roi numeric NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_templates TO authenticated;
GRANT ALL ON public.plan_templates TO service_role;

ALTER TABLE public.plan_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active plans"
  ON public.plan_templates FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert plan templates"
  ON public.plan_templates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update plan templates"
  ON public.plan_templates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete plan templates"
  ON public.plan_templates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_plan_templates_updated_at
  BEFORE UPDATE ON public.plan_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link user_investments to templates (nullable, snapshot fields remain source of truth)
ALTER TABLE public.user_investments
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.plan_templates(id) ON DELETE SET NULL;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.plan_templates;

-- Seed 5 tiers
INSERT INTO public.plan_templates (name, coin, principal_min, principal_max, daily_roi, duration_days, sort_order, description) VALUES
  ('Recruit Plan',        'BTC',  100,    999,    0.01,  30, 1, 'Entry-level plan for new investors.'),
  ('Inspectors Plan',     'USDT', 1000,   4999,   0.015, 45, 2, 'Mid-tier plan with higher daily returns.'),
  ('Superintendent Plan', 'ETH',  5000,   19999,  0.02,  60, 3, 'Advanced tier with strong ROI.'),
  ('Commissioners Plan',  'BTC',  20000,  49999,  0.025, 75, 4, 'High-capital tier with premium ROI.'),
  ('General Plan',        'USDT', 50000,  1000000,0.03,  90, 5, 'Top-tier plan for large principals.');