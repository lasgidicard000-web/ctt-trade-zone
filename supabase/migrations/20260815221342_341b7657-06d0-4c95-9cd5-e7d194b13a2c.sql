CREATE POLICY "Users insert own investments"
ON public.user_investments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);