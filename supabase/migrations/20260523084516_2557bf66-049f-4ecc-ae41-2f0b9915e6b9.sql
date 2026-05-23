
-- 1. Profiles: restrict SELECT to authenticated users only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- 2. Referrals: remove user UPDATE (reward_claimed manipulation)
DROP POLICY IF EXISTS "Users can update their own referrals" ON public.referrals;

-- 3. Rewards history: remove user INSERT (self-credit)
DROP POLICY IF EXISTS "Users can insert their own rewards" ON public.rewards_history;

-- 4. User milestones: remove user UPDATE (fraudulent completion)
DROP POLICY IF EXISTS "Users can update their own milestone progress" ON public.user_milestones;

-- 5. Crypto payments: remove user UPDATE (status manipulation)
DROP POLICY IF EXISTS "Users can update their own crypto payments" ON public.crypto_payments;

-- 6. Deposit history: remove user INSERT (fabricated deposits)
DROP POLICY IF EXISTS "Users can insert their own deposit history" ON public.deposit_history;

-- 7. Gift card screenshots bucket: make private + scoped policies
UPDATE storage.buckets SET public = false WHERE id = 'gift-card-screenshots';

DROP POLICY IF EXISTS "Anyone can view gift card screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload gift card screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own gift card screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Owner or admin can view gift card screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all gift card screenshots" ON storage.objects;

CREATE POLICY "Owner or admin can view gift card screenshots"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'gift-card-screenshots' AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Users can upload to their own gift card folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'gift-card-screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own gift card screenshots"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'gift-card-screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own gift card screenshots"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'gift-card-screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
