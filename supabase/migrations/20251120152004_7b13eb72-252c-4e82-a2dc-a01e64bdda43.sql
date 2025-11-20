-- Create deposit_history table
CREATE TABLE public.deposit_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  coin_symbol TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  transaction_hash TEXT,
  confirmation_status TEXT NOT NULL DEFAULT 'pending',
  confirmations INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.deposit_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own deposit history"
ON public.deposit_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deposit history"
ON public.deposit_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all deposit history"
ON public.deposit_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update deposit history"
ON public.deposit_history
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_deposit_history_user_id ON public.deposit_history(user_id);
CREATE INDEX idx_deposit_history_status ON public.deposit_history(confirmation_status);