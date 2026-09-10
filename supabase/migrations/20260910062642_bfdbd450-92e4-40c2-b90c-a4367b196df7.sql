ALTER TABLE public.virtual_cards
  ADD COLUMN IF NOT EXISTS billing_street text,
  ADD COLUMN IF NOT EXISTS billing_suburb text,
  ADD COLUMN IF NOT EXISTS billing_city text,
  ADD COLUMN IF NOT EXISTS billing_state text,
  ADD COLUMN IF NOT EXISTS billing_zip text,
  ADD COLUMN IF NOT EXISTS billing_country text;

DROP FUNCTION IF EXISTS public.get_my_card();

CREATE FUNCTION public.get_my_card()
 RETURNS TABLE(id uuid, last4 text, expiry_month integer, expiry_year integer, status text, network text, daily_limit numeric, per_tx_limit numeric, has_pin boolean, issued_at timestamp with time zone, spent_today numeric, spent_total numeric, balance_usd numeric, deposit_address text, activation_required_usd numeric, activated_at timestamp with time zone, credited_usd numeric, billing_street text, billing_suburb text, billing_city text, billing_state text, billing_zip text, billing_country text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT c.id, c.last4, c.expiry_month, c.expiry_year, c.status, c.network,
         c.daily_limit, c.per_tx_limit, (c.pin_hash IS NOT NULL), c.issued_at,
         COALESCE((SELECT sum(t.amount_usd) FROM public.card_transactions t
            WHERE t.card_id = c.id AND t.status = 'approved'
              AND t.created_at >= date_trunc('day', now())), 0),
         COALESCE((SELECT sum(t.amount_usd) FROM public.card_transactions t
            WHERE t.card_id = c.id AND t.status = 'approved'), 0),
         c.balance_usd, c.deposit_address, c.activation_required_usd, c.activated_at,
         COALESCE((SELECT sum(f.amount_usd) FROM public.card_funding_requests f
            WHERE f.card_id = c.id AND f.status = 'credited'), 0),
         c.billing_street, c.billing_suburb, c.billing_city, c.billing_state, c.billing_zip, c.billing_country
  FROM public.virtual_cards c
  WHERE c.user_id = auth.uid() AND c.status <> 'terminated'
  LIMIT 1
$function$;

REVOKE EXECUTE ON FUNCTION public.get_my_card() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_card() TO authenticated;