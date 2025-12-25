-- Add gift_card_type and email columns to redemptions table
ALTER TABLE public.redemptions 
ADD COLUMN IF NOT EXISTS gift_card_type text,
ADD COLUMN IF NOT EXISTS email text;