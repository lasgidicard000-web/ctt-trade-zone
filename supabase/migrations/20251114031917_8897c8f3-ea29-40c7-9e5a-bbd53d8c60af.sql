-- Create referrals table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  reward_claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(referee_id)
);

-- Create milestones table
CREATE TABLE public.milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  milestone_type TEXT NOT NULL, -- 'trade_count', 'trade_volume', 'deposit_amount'
  target_value NUMERIC NOT NULL,
  reward_amount NUMERIC NOT NULL,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_milestones table to track progress
CREATE TABLE public.user_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  current_progress NUMERIC NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  reward_claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, milestone_id)
);

-- Create rewards_history table
CREATE TABLE public.rewards_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL, -- 'referral_referrer', 'referral_referee', 'milestone'
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals
CREATE POLICY "Users can view their own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

CREATE POLICY "Users can insert referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (auth.uid() = referee_id);

CREATE POLICY "Users can update their own referrals"
  ON public.referrals FOR UPDATE
  USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

-- RLS Policies for milestones
CREATE POLICY "Milestones are viewable by everyone"
  ON public.milestones FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage milestones"
  ON public.milestones FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for user_milestones
CREATE POLICY "Users can view their own milestone progress"
  ON public.user_milestones FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own milestone progress"
  ON public.user_milestones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own milestone progress"
  ON public.user_milestones FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for rewards_history
CREATE POLICY "Users can view their own rewards history"
  ON public.rewards_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rewards"
  ON public.rewards_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create trigger for user_milestones updated_at
CREATE TRIGGER update_user_milestones_updated_at
  BEFORE UPDATE ON public.user_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default milestones
INSERT INTO public.milestones (name, description, milestone_type, target_value, reward_amount, icon) VALUES
  ('First Trade', 'Complete your first trade', 'trade_count', 1, 5, '🎯'),
  ('Trading Novice', 'Complete 10 trades', 'trade_count', 10, 25, '⭐'),
  ('Trading Expert', 'Complete 50 trades', 'trade_count', 50, 100, '🏆'),
  ('Volume Starter', 'Trade $100 total volume', 'trade_volume', 100, 10, '💰'),
  ('Volume Pro', 'Trade $1,000 total volume', 'trade_volume', 1000, 50, '💎'),
  ('Big Depositor', 'Deposit $100 or more', 'deposit_amount', 100, 20, '🎁');