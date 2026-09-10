ALTER TABLE public.virtual_cards
  ADD COLUMN IF NOT EXISTS balance_usd numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_address text,
  ADD COLUMN IF NOT EXISTS activation_required_usd numeric NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

UPDATE public.virtual_cards
  SET deposit_address = 'TFyYSnWZTUyEWJyqWHW4fE6FSwJhtYVq9L'
  WHERE deposit_address IS NULL;

ALTER TABLE public.virtual_cards
  ALTER COLUMN deposit_address SET DEFAULT 'TFyYSnWZTUyEWJyqWHW4fE6FSwJhtYVq9L';

CREATE TABLE IF NOT EXISTS public.card_funding_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  card_id uuid NOT NULL REFERENCES public.virtual_cards(id) ON DELETE CASCADE,
  amount_usd numeric NOT NULL,
  coin_symbol text NOT NULL DEFAULT 'USDT',
  network text NOT NULL DEFAULT 'TRC20',
  deposit_address text NOT NULL,
  tx_hash text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  credited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.card_funding_requests TO authenticated;
GRANT ALL ON public.card_funding_requests TO service_role;

ALTER TABLE public.card_funding_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cfr_select_own" ON public.card_funding_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "cfr_insert_own" ON public.card_funding_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE TRIGGER update_card_funding_requests_updated_at
  BEFORE UPDATE ON public.card_funding_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS card_funding_requests_user_idx ON public.card_funding_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS card_funding_requests_status_idx ON public.card_funding_requests(status, created_at DESC);

-- member requests funding for their own card
CREATE OR REPLACE FUNCTION public.card_request_funding(_card_id uuid, _amount_usd numeric, _tx_hash text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _c public.virtual_cards;
  _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO _c FROM public.virtual_cards WHERE id = _card_id;
  IF _c.id IS NULL OR _c.user_id <> auth.uid() THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF _amount_usd IS NULL OR _amount_usd <= 0 OR _amount_usd > 1000000 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;
  IF _tx_hash IS NOT NULL AND length(_tx_hash) > 128 THEN
    RAISE EXCEPTION 'transaction hash too long';
  END IF;

  INSERT INTO public.card_funding_requests(user_id, card_id, amount_usd, deposit_address, tx_hash)
  VALUES (_c.user_id, _c.id, _amount_usd,
          COALESCE(_c.deposit_address, 'TFyYSnWZTUyEWJyqWHW4fE6FSwJhtYVq9L'),
          NULLIF(btrim(COALESCE(_tx_hash, '')), ''))
  RETURNING id INTO _id;

  RETURN jsonb_build_object('ok', true, 'id', _id);
END;
$$;

-- admin credits or rejects a funding request
CREATE OR REPLACE FUNCTION public.admin_credit_card_funding(_request_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _r public.card_funding_requests;
  _c public.virtual_cards;
  _credited numeric;
  _activated boolean := false;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;

  SELECT * INTO _r FROM public.card_funding_requests WHERE id = _request_id FOR UPDATE;
  IF _r.id IS NULL THEN RAISE EXCEPTION 'request not found'; END IF;
  IF _r.status <> 'pending' THEN RAISE EXCEPTION 'request already processed'; END IF;

  IF NOT _approve THEN
    UPDATE public.card_funding_requests
      SET status = 'rejected', admin_note = _note, updated_at = now()
      WHERE id = _request_id;
    RETURN jsonb_build_object('ok', true, 'status', 'rejected');
  END IF;

  UPDATE public.card_funding_requests
    SET status = 'credited', admin_note = _note, credited_at = now(), updated_at = now()
    WHERE id = _request_id;

  UPDATE public.virtual_cards
    SET balance_usd = balance_usd + _r.amount_usd, updated_at = now()
    WHERE id = _r.card_id
    RETURNING * INTO _c;

  SELECT COALESCE(sum(amount_usd), 0) INTO _credited
  FROM public.card_funding_requests
  WHERE card_id = _r.card_id AND status = 'credited';

  IF _c.activated_at IS NULL AND _credited >= _c.activation_required_usd THEN
    UPDATE public.virtual_cards
      SET activated_at = now(), status = 'active', updated_at = now()
      WHERE id = _r.card_id;
    _activated := true;
  END IF;

  INSERT INTO public.transactions(user_id, type, to_symbol, amount, status, notes)
  VALUES (_r.user_id, 'card_funding', _r.coin_symbol, _r.amount_usd, 'completed',
          'CTT spend card funding credited ($' || _r.amount_usd::text || ' ' || _r.network || ')');

  INSERT INTO public.card_security_events(user_id, card_id, action, success, detail)
  VALUES (_r.user_id, _r.card_id, 'funding_credited', true,
          '$' || _r.amount_usd::text || ' ' || _r.coin_symbol || ' ' || _r.network);

  RETURN jsonb_build_object('ok', true, 'status', 'credited', 'credited_total', _credited, 'activated', _activated);
END;
$$;

-- card details now include balance + activation state
DROP FUNCTION IF EXISTS public.get_my_card();
CREATE FUNCTION public.get_my_card()
RETURNS TABLE(id uuid, last4 text, expiry_month integer, expiry_year integer, status text, network text, daily_limit numeric, per_tx_limit numeric, has_pin boolean, issued_at timestamp with time zone, spent_today numeric, spent_total numeric, balance_usd numeric, deposit_address text, activation_required_usd numeric, activated_at timestamp with time zone, credited_usd numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id, c.last4, c.expiry_month, c.expiry_year, c.status, c.network,
         c.daily_limit, c.per_tx_limit, (c.pin_hash IS NOT NULL), c.issued_at,
         COALESCE((SELECT sum(t.amount_usd) FROM public.card_transactions t
            WHERE t.card_id = c.id AND t.status = 'approved'
              AND t.created_at >= date_trunc('day', now())), 0),
         COALESCE((SELECT sum(t.amount_usd) FROM public.card_transactions t
            WHERE t.card_id = c.id AND t.status = 'approved'), 0),
         c.balance_usd, c.deposit_address, c.activation_required_usd, c.activated_at,
         COALESCE((SELECT sum(f.amount_usd) FROM public.card_funding_requests f
            WHERE f.card_id = c.id AND f.status = 'credited'), 0)
  FROM public.virtual_cards c
  WHERE c.user_id = auth.uid() AND c.status <> 'terminated'
  LIMIT 1
$$;

-- spending now debits the card balance and requires activation
CREATE OR REPLACE FUNCTION public.card_spend(_card_id uuid, _merchant text, _amount_usd numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _c public.virtual_cards;
  _rate numeric;
  _btc numeric;
  _spent_today numeric;
  _reason text;
BEGIN
  SELECT * INTO _c FROM public.virtual_cards WHERE id = _card_id FOR UPDATE;
  IF _c.id IS NULL OR _c.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _merchant IS NULL OR length(btrim(_merchant)) = 0 OR length(_merchant) > 100 THEN
    RAISE EXCEPTION 'merchant is required';
  END IF;
  IF _amount_usd IS NULL OR _amount_usd <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  SELECT price INTO _rate FROM public.coin_prices WHERE symbol = 'BTC';
  IF _rate IS NULL OR _rate <= 0 THEN _rate := 1; END IF;
  _btc := round((_amount_usd / _rate)::numeric, 8);

  SELECT COALESCE(sum(amount_usd), 0) INTO _spent_today FROM public.card_transactions
    WHERE card_id = _card_id AND status = 'approved' AND created_at >= date_trunc('day', now());

  IF _c.activated_at IS NULL THEN _reason := 'Card not activated — activation deposit required';
  ELSIF _c.status = 'frozen' THEN _reason := 'Card frozen';
  ELSIF _c.status <> 'active' THEN _reason := 'Card not active';
  ELSIF _amount_usd > _c.per_tx_limit THEN _reason := 'Exceeds per-transaction limit';
  ELSIF _spent_today + _amount_usd > _c.daily_limit THEN _reason := 'Exceeds daily limit';
  ELSIF _amount_usd > _c.balance_usd THEN _reason := 'Insufficient card balance';
  END IF;

  IF _reason IS NOT NULL THEN
    INSERT INTO public.card_transactions(card_id, user_id, merchant, amount_usd, amount_btc, btc_rate, status, decline_reason)
    VALUES (_card_id, _c.user_id, _merchant, _amount_usd, _btc, _rate, 'declined', _reason);
    RETURN jsonb_build_object('ok', false, 'declined', true, 'reason', _reason);
  END IF;

  UPDATE public.virtual_cards SET balance_usd = balance_usd - _amount_usd, updated_at = now()
    WHERE id = _card_id;

  INSERT INTO public.card_transactions(card_id, user_id, merchant, amount_usd, amount_btc, btc_rate, status)
  VALUES (_card_id, _c.user_id, _merchant, _amount_usd, _btc, _rate, 'approved');

  INSERT INTO public.transactions(user_id, type, from_symbol, amount, status, notes)
  VALUES (_c.user_id, 'card_purchase', 'USD', _amount_usd, 'completed',
          'CTT card purchase at ' || _merchant || ' ($' || _amount_usd::text || ')');

  RETURN jsonb_build_object('ok', true, 'btc', _btc, 'rate', _rate,
                            'newBalance', _c.balance_usd - _amount_usd);
END;
$$;