DROP POLICY IF EXISTS "Anyone can view plan entitlements" ON public.plan_entitlements;

CREATE POLICY "Authenticated users can view plan entitlements"
ON public.plan_entitlements
FOR SELECT
TO authenticated
USING (true);