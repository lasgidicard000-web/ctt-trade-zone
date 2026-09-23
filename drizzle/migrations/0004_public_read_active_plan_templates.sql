DROP POLICY IF EXISTS "Public can view active plans" ON public.plan_templates;
CREATE POLICY "Public can view active plans"
ON public.plan_templates
FOR SELECT
TO anon
USING (is_active = true);