-- Create table for storing historical price data
CREATE TABLE IF NOT EXISTS public.coin_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coin_symbol TEXT NOT NULL,
  price NUMERIC NOT NULL,
  open NUMERIC NOT NULL,
  high NUMERIC NOT NULL,
  low NUMERIC NOT NULL,
  close NUMERIC NOT NULL,
  volume NUMERIC NOT NULL DEFAULT 0,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coin_price_history ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing price history (public read)
CREATE POLICY "Price history is viewable by everyone"
ON public.coin_price_history
FOR SELECT
USING (true);

-- Create policy for admins to insert price history
CREATE POLICY "Admins can insert price history"
ON public.coin_price_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_coin_price_history_symbol_timestamp 
ON public.coin_price_history(coin_symbol, timestamp DESC);