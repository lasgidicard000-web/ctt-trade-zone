-- Create a table for cryptocurrency wallet addresses
CREATE TABLE public.crypto_wallet_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  coin_symbol TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, coin_symbol)
);

-- Enable Row Level Security
ALTER TABLE public.crypto_wallet_addresses ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own wallet addresses" 
ON public.crypto_wallet_addresses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet addresses" 
ON public.crypto_wallet_addresses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet addresses" 
ON public.crypto_wallet_addresses 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_crypto_wallet_addresses_updated_at
BEFORE UPDATE ON public.crypto_wallet_addresses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_crypto_wallet_addresses_user_id ON public.crypto_wallet_addresses(user_id);
CREATE INDEX idx_crypto_wallet_addresses_coin_symbol ON public.crypto_wallet_addresses(coin_symbol);