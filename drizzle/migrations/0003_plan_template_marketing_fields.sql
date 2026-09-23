ALTER TABLE public.plan_templates
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS about text,
  ADD COLUMN IF NOT EXISTS highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS show_on_homepage boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_on_dashboard boolean NOT NULL DEFAULT true;

GRANT SELECT ON public.plan_templates TO anon;
GRANT SELECT ON public.plan_templates TO authenticated;
GRANT ALL ON public.plan_templates TO service_role;