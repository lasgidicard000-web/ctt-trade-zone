DROP POLICY IF EXISTS "Users can create their own crypto payments" ON public.crypto_payments;

CREATE POLICY "Users can create their own pending crypto payments"
ON public.crypto_payments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND payment_status = 'waiting'
  AND actually_paid IS NULL
  AND outcome_amount IS NULL
  AND completed_at IS NULL
);