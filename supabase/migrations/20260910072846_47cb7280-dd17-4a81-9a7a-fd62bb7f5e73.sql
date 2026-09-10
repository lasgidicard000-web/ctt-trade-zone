CREATE TABLE public.merchant_payment_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  card_id uuid NOT NULL REFERENCES public.virtual_cards(id) ON DELETE CASCADE,
  merchant text NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  amount_usd numeric NOT NULL CHECK (amount_usd > 0),
  reference text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  decided_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.merchant_payment_requests TO authenticated;
GRANT ALL ON public.merchant_payment_requests TO service_role;

ALTER TABLE public.merchant_payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_select" ON public.merchant_payment_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admin_select" ON public.merchant_payment_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_mpr_user ON public.merchant_payment_requests(user_id, created_at DESC);
CREATE INDEX idx_mpr_status ON public.merchant_payment_requests(status, created_at DESC);

CREATE TRIGGER update_mpr_updated_at BEFORE UPDATE ON public.merchant_payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.merchant_request_payment(
  _card_id uuid, _merchant text, _category text DEFAULT 'Other',
  _amount_usd numeric DEFAULT 0, _reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _c public.virtual_cards;
  _spent_today numeric;
  _held_today numeric;
  _reason text;
  _id uuid;
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
  IF _reference IS NOT NULL AND length(_reference) > 200 THEN
    RAISE EXCEPTION 'reference too long';
  END IF;

  SELECT COALESCE(sum(amount_usd), 0) INTO _spent_today FROM public.card_transactions
    WHERE card_id = _card_id AND status = 'approved' AND created_at >= date_trunc('day', now());
  SELECT COALESCE(sum(amount_usd), 0) INTO _held_today FROM public.merchant_payment_requests
    WHERE card_id = _card_id AND status = 'pending' AND created_at >= date_trunc('day', now());

  IF _c.activated_at IS NULL THEN _reason := 'Card not activated — activation deposit required';
  ELSIF _c.status = 'frozen' THEN _reason := 'Card frozen';
  ELSIF _c.status <> 'active' THEN _reason := 'Card not active';
  ELSIF _amount_usd > _c.per_tx_limit THEN _reason := 'Exceeds per-transaction limit';
  ELSIF _spent_today + _held_today + _amount_usd > _c.daily_limit THEN _reason := 'Exceeds daily limit';
  ELSIF _amount_usd > _c.balance_usd THEN _reason := 'Insufficient card balance';
  END IF;

  IF _reason IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', _reason);
  END IF;

  UPDATE public.virtual_cards SET balance_usd = balance_usd - _amount_usd, updated_at = now()
    WHERE id = _card_id;

  INSERT INTO public.merchant_payment_requests(user_id, card_id, merchant, category, amount_usd, reference)
  VALUES (_c.user_id, _card_id, btrim(_merchant), COALESCE(NULLIF(btrim(_category), ''), 'Other'), _amount_usd, NULLIF(btrim(_reference), ''))
  RETURNING id INTO _id;

  INSERT INTO public.card_security_events(user_id, card_id, action, success, detail)
  VALUES (_c.user_id, _card_id, 'merchant_payment_requested', true,
          btrim(_merchant) || ' $' || _amount_usd::text);

  RETURN jsonb_build_object('ok', true, 'id', _id, 'newBalance', _c.balance_usd - _amount_usd);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_decide_merchant_payment(
  _request_id uuid, _approve boolean, _note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _r public.merchant_payment_requests;
  _rate numeric;
  _btc numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;

  SELECT * INTO _r FROM public.merchant_payment_requests WHERE id = _request_id FOR UPDATE;
  IF _r.id IS NULL THEN RAISE EXCEPTION 'request not found'; END IF;
  IF _r.status <> 'pending' THEN RAISE EXCEPTION 'request already processed'; END IF;

  IF NOT _approve THEN
    UPDATE public.merchant_payment_requests
      SET status = 'declined', admin_note = _note, decided_at = now(), updated_at = now()
      WHERE id = _request_id;
    UPDATE public.virtual_cards SET balance_usd = balance_usd + _r.amount_usd, updated_at = now()
      WHERE id = _r.card_id;
    INSERT INTO public.card_security_events(user_id, card_id, action, success, detail)
    VALUES (_r.user_id, _r.card_id, 'merchant_payment_declined', false,
            _r.merchant || ' $' || _r.amount_usd::text || COALESCE(' — ' || _note, ''));
    INSERT INTO public.admin_transaction_log(admin_user_id, action, target_table, target_id, target_user_id, after, reason)
    VALUES (auth.uid(), 'merchant_payment_declined', 'merchant_payment_requests', _request_id, _r.user_id,
            to_jsonb(_r), _note);
    RETURN jsonb_build_object('ok', true, 'status', 'declined');
  END IF;

  SELECT price INTO _rate FROM public.coin_prices WHERE symbol = 'BTC';
  IF _rate IS NULL OR _rate <= 0 THEN _rate := 1; END IF;
  _btc := round((_r.amount_usd / _rate)::numeric, 8);

  UPDATE public.merchant_payment_requests
    SET status = 'approved', admin_note = _note, decided_at = now(), updated_at = now()
    WHERE id = _request_id;

  INSERT INTO public.card_transactions(card_id, user_id, merchant, amount_usd, amount_btc, btc_rate, status)
  VALUES (_r.card_id, _r.user_id, _r.merchant, _r.amount_usd, _btc, _rate, 'approved');

  INSERT INTO public.transactions(user_id, type, from_symbol, amount, status, notes)
  VALUES (_r.user_id, 'card_purchase', 'USD', _r.amount_usd, 'completed',
          'CTT card payment to ' || _r.merchant || ' ($' || _r.amount_usd::text || ')');

  INSERT INTO public.card_security_events(user_id, card_id, action, success, detail)
  VALUES (_r.user_id, _r.card_id, 'merchant_payment_approved', true,
          _r.merchant || ' $' || _r.amount_usd::text);

  INSERT INTO public.admin_transaction_log(admin_user_id, action, target_table, target_id, target_user_id, after, reason)
  VALUES (auth.uid(), 'merchant_payment_approved', 'merchant_payment_requests', _request_id, _r.user_id,
          to_jsonb(_r), _note);

  RETURN jsonb_build_object('ok', true, 'status', 'approved');
END;
$$;

REVOKE ALL ON FUNCTION public.merchant_request_payment(uuid, text, text, numeric, text) FROM anon;
REVOKE ALL ON FUNCTION public.admin_decide_merchant_payment(uuid, boolean, text) FROM anon;