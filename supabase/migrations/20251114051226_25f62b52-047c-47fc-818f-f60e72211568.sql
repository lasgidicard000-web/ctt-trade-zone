-- Create crypto_payments table to track NOWPayments transactions
CREATE TABLE IF NOT EXISTS public.crypto_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  payment_id TEXT NOT NULL UNIQUE,
  pay_address TEXT,
  pay_amount NUMERIC,
  pay_currency TEXT NOT NULL,
  price_amount NUMERIC NOT NULL,
  price_currency TEXT NOT NULL DEFAULT 'USD',
  order_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'waiting',
  actually_paid NUMERIC,
  outcome_amount NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.crypto_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for crypto_payments
CREATE POLICY "Users can view their own crypto payments"
ON public.crypto_payments
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own crypto payments"
ON public.crypto_payments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own crypto payments"
ON public.crypto_payments
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all crypto payments
CREATE POLICY "Admins can view all crypto payments"
ON public.crypto_payments
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_crypto_payments_updated_at
BEFORE UPDATE ON public.crypto_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();