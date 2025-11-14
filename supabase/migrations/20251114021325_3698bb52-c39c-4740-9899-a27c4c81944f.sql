-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Update coin_prices RLS to allow admin updates
CREATE POLICY "Admins can update coin prices"
ON public.coin_prices
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Update coin_prices RLS to allow admin inserts
CREATE POLICY "Admins can insert coin prices"
ON public.coin_prices
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update coin_prices RLS to allow admin deletes
CREATE POLICY "Admins can delete coin prices"
ON public.coin_prices
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Add policy for admins to view all transactions
CREATE POLICY "Admins can view all transactions"
ON public.transactions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Add policy for admins to view all redemptions
CREATE POLICY "Admins can view all redemptions"
ON public.redemptions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Add policy for admins to update redemptions
CREATE POLICY "Admins can update redemptions"
ON public.redemptions
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Add policy for admins to view all wallet balances
CREATE POLICY "Admins can view all wallet balances"
ON public.wallet_balances
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));