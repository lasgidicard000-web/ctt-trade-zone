-- Add avatar_url column to profiles table if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (new.id, new.raw_user_meta_data->>'display_name');
  RETURN new;
END;
$$;

-- Create trigger to automatically create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add unique constraint on coin symbol if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coin_prices_symbol_key'
  ) THEN
    ALTER TABLE public.coin_prices ADD CONSTRAINT coin_prices_symbol_key UNIQUE (symbol);
  END IF;
END $$;

-- Seed coin prices with current data
INSERT INTO public.coin_prices (symbol, name, price, change_24h, icon_url)
VALUES 
  ('BTC', 'Bitcoin', 102916.67, 2.4, NULL),
  ('ETH', 'Ethereum', 3498.58, -1.2, NULL),
  ('USDT', 'Tether', 1.00, 0.0, NULL),
  ('BNB', 'Binance Coin', 1004.07, 3.8, NULL),
  ('CCT', 'Custom Coin Token', 12350.00, 5.2, NULL)
ON CONFLICT (symbol) DO UPDATE SET
  price = EXCLUDED.price,
  change_24h = EXCLUDED.change_24h,
  updated_at = now();