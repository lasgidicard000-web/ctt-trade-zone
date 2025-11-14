-- Create virtual wallet balances table for trading simulator
CREATE TABLE public.virtual_wallet_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  coin_symbol TEXT NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, coin_symbol)
);

-- Create virtual transactions table for trade history
CREATE TABLE public.virtual_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  coin_symbol TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.virtual_wallet_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for virtual_wallet_balances
CREATE POLICY "Users can view their own virtual balances"
  ON public.virtual_wallet_balances
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own virtual balances"
  ON public.virtual_wallet_balances
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own virtual balances"
  ON public.virtual_wallet_balances
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for virtual_transactions
CREATE POLICY "Users can view their own virtual transactions"
  ON public.virtual_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own virtual transactions"
  ON public.virtual_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_virtual_wallet_balances_updated_at
  BEFORE UPDATE ON public.virtual_wallet_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Initialize users with $10,000 virtual USD (USDT)
-- This will be handled in the app when users first access the simulator