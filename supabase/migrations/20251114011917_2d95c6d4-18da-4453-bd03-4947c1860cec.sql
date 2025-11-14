-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create coin_prices table for admin-managed coin prices
CREATE TABLE public.coin_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price DECIMAL(20, 8) NOT NULL,
  change_24h DECIMAL(10, 2) DEFAULT 0,
  icon_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coin_prices ENABLE ROW LEVEL SECURITY;

-- Policies for coin_prices (readable by all, writable by admin only)
CREATE POLICY "Coin prices are viewable by everyone" 
ON public.coin_prices 
FOR SELECT 
USING (true);

-- Create redemptions table for gift card redemptions
CREATE TABLE public.redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  gift_card_code TEXT NOT NULL,
  crypto_symbol TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  amount DECIMAL(20, 8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;

-- Policies for redemptions
CREATE POLICY "Users can view their own redemptions" 
ON public.redemptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own redemptions" 
ON public.redemptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create wallet_balances table
CREATE TABLE public.wallet_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  coin_symbol TEXT NOT NULL,
  balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, coin_symbol)
);

-- Enable RLS
ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;

-- Policies for wallet_balances
CREATE POLICY "Users can view their own wallet balances" 
ON public.wallet_balances 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet balances" 
ON public.wallet_balances 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet balances" 
ON public.wallet_balances 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  from_symbol TEXT,
  to_symbol TEXT,
  amount DECIMAL(20, 8) NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Policies for transactions
CREATE POLICY "Users can view their own transactions" 
ON public.transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions" 
ON public.transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coin_prices_updated_at
BEFORE UPDATE ON public.coin_prices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_redemptions_updated_at
BEFORE UPDATE ON public.redemptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wallet_balances_updated_at
BEFORE UPDATE ON public.wallet_balances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial coin prices
INSERT INTO public.coin_prices (symbol, name, price, change_24h, icon_url) VALUES
  ('BTC', 'Bitcoin', 45000.00, 2.5, NULL),
  ('ETH', 'Ethereum', 3000.00, 1.8, NULL),
  ('USDT', 'Tether', 1.00, 0.01, NULL),
  ('BNB', 'Binance Coin', 350.00, 3.2, NULL),
  ('CCT', 'Crypto Card Token', 0.50, 5.0, NULL);