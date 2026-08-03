-- pgcrypto for hashing PINs
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.virtual_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  card_number text NOT NULL,
  last4 text NOT NULL,
  expiry_month integer NOT NULL,
  expiry_year integer NOT NULL,
  cvv text NOT NULL,
  pin_hash text,
  status text NOT NULL DEFAULT 'active',
  network text NOT NULL DEFAULT 'CTT Virtual Mastercard',
  daily_limit numeric NOT NULL DEFAULT 2000,
  per_tx_limit numeric NOT NULL DEFAULT 500,
  issued_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX virtual_cards_one_live_per_user
  ON public.virtual_cards(user_id)
  WHERE status <> 'terminated';

GRANT SELECT ON public.virtual_cards TO authenticated;
GRANT ALL ON public.virtual_cards TO service_role;
ALTER TABLE public.virtual_cards ENABLE ROW LEVEL SECURITY;

-- Raw table (contains PAN/CVV) is readable only by admins; users go through RPCs.
CREATE POLICY "Admins can view all cards"
  ON public.virtual_cards FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_virtual_cards_updated_at
  BEFORE UPDATE ON public.virtual_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.card_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id uuid NOT NULL REFERENCES public.virtual_cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  merchant text NOT NULL,
  amount_usd numeric NOT NULL,
  amount_btc numeric NOT NULL DEFAULT 0,
  btc_rate numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'approved',
  decline_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.card_transactions TO authenticated;
GRANT ALL ON public.card_transactions TO service_role;
ALTER TABLE public.card_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own card transactions"
  ON public.card_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Masked card info for the owner (or admin)
CREATE OR REPLACE FUNCTION public.get_my_card()
RETURNS TABLE(
  id uuid, last4 text, expiry_month integer, expiry_year integer,
  status text, network text, daily_limit numeric, per_tx_limit numeric,
  has_pin boolean, issued_at timestamp with time zone,
  spent_today numeric, spent_total numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.last4, c.expiry_month, c.expiry_year, c.status, c.network,
         c.daily_limit, c.per_tx_limit, (c.pin_hash IS NOT NULL), c.issued_at,
         COALESCE((SELECT sum(t.amount_usd) FROM public.card_transactions t
            WHERE t.card_id = c.id AND t.status = 'approved'
              AND t.created_at >= date_trunc('day', now())), 0),
         COALESCE((SELECT sum(t.amount_usd) FROM public.card_transactions t
            WHERE t.card_id = c.id AND t.status = 'approved'), 0)
  FROM public.virtual_cards c
  WHERE c.user_id = auth.uid() AND c.status <> 'terminated'
  LIMIT 1
$$;

-- Issue a card when eligible
CREATE OR REPLACE FUNCTION public.issue_virtual_card()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _started timestamptz;
  _ent public.plan_entitlements;
  _num text;
  _card_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  IF EXISTS (SELECT 1 FROM public.virtual_cards WHERE user_id = _uid AND status <> 'terminated') THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;

  IF NOT public.has_active_plan(_uid, 'commissioners') THEN
    RAISE EXCEPTION 'card requires an active Commissioners plan or higher';
  END IF;

  SELECT min(started_at) INTO _started
  FROM public.user_investments ui
  JOIN public.plan_entitlements pe ON pe.plan_id = ui.plan_id
  JOIN public.plan_entitlements req ON req.plan_id = 'commissioners'
  WHERE ui.user_id = _uid AND ui.status = 'active' AND ui.ends_at > now()
    AND pe.tier_rank >= req.tier_rank;

  IF _started IS NULL OR now() < _started + interval '24 hours' THEN
    RAISE EXCEPTION 'card issuance window has not elapsed yet';
  END IF;

  _ent := public.get_user_entitlements(_uid);

  _num := '5' || lpad((floor(random() * 1000000000000000))::bigint::text, 15, '0');

  INSERT INTO public.virtual_cards(
    user_id, card_number, last4, expiry_month, expiry_year, cvv,
    status, daily_limit, per_tx_limit
  ) VALUES (
    _uid, _num, right(_num, 4),
    EXTRACT(month FROM now())::int,
    EXTRACT(year FROM now())::int + 4,
    lpad((floor(random() * 1000))::int::text, 3, '0'),
    'active',
    COALESCE(_ent.daily_withdrawal_cap, 2000),
    GREATEST(500, COALESCE(_ent.daily_withdrawal_cap, 2000) * 0.1)
  ) RETURNING id INTO _card_id;

  RETURN jsonb_build_object('ok', true, 'cardId', _card_id);
END;
$$;

-- Full PAN/CVV, owner only
CREATE OR REPLACE FUNCTION public.get_card_details(_card_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _c public.virtual_cards;
BEGIN
  SELECT * INTO _c FROM public.virtual_cards WHERE id = _card_id;
  IF _c.id IS NULL OR _c.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN jsonb_build_object(
    'card_number', _c.card_number,
    'cvv', _c.cvv,
    'expiry_month', _c.expiry_month,
    'expiry_year', _c.expiry_year
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_card_pin(_card_id uuid, _pin text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF _pin !~ '^[0-9]{4}$' THEN RAISE EXCEPTION 'PIN must be 4 digits'; END IF;
  UPDATE public.virtual_cards
  SET pin_hash = extensions.crypt(_pin, extensions.gen_salt('bf'))
  WHERE id = _card_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_card_status(_card_id uuid, _status text, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _c public.virtual_cards; _is_admin boolean;
BEGIN
  IF _status NOT IN ('active','frozen','terminated') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  SELECT * INTO _c FROM public.virtual_cards WHERE id = _card_id;
  IF _c.id IS NULL THEN RAISE EXCEPTION 'card not found'; END IF;
  _is_admin := public.has_role(auth.uid(), 'admin');
  IF _c.user_id <> auth.uid() AND NOT _is_admin THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.virtual_cards SET status = _status WHERE id = _card_id;

  IF _is_admin AND _c.user_id <> auth.uid() THEN
    INSERT INTO public.admin_transaction_log(
      admin_user_id, action, target_table, target_id, target_user_id, before, after, reason
    ) VALUES (
      auth.uid(), 'card-status', 'virtual_cards', _card_id, _c.user_id,
      jsonb_build_object('status', _c.status),
      jsonb_build_object('status', _status), _reason
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', _status);
END;
$$;

-- Card purchase
CREATE OR REPLACE FUNCTION public.card_spend(_card_id uuid, _merchant text, _amount_usd numeric)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _c public.virtual_cards;
  _rate numeric;
  _btc numeric;
  _bal numeric;
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
  IF _rate IS NULL OR _rate <= 0 THEN RAISE EXCEPTION 'BTC price unavailable'; END IF;

  SELECT COALESCE(balance, 0) INTO _bal FROM public.wallet_balances
    WHERE user_id = _c.user_id AND coin_symbol = 'BTC' FOR UPDATE;
  _bal := COALESCE(_bal, 0);

  SELECT COALESCE(sum(amount_usd), 0) INTO _spent_today FROM public.card_transactions
    WHERE card_id = _card_id AND status = 'approved' AND created_at >= date_trunc('day', now());

  _btc := round((_amount_usd / _rate)::numeric, 8);

  IF _c.status = 'frozen' THEN _reason := 'Card frozen';
  ELSIF _c.status <> 'active' THEN _reason := 'Card not active';
  ELSIF _amount_usd > _c.per_tx_limit THEN _reason := 'Exceeds per-transaction limit';
  ELSIF _spent_today + _amount_usd > _c.daily_limit THEN _reason := 'Exceeds daily limit';
  ELSIF _btc > _bal THEN _reason := 'Insufficient balance';
  END IF;

  IF _reason IS NOT NULL THEN
    INSERT INTO public.card_transactions(card_id, user_id, merchant, amount_usd, amount_btc, btc_rate, status, decline_reason)
    VALUES (_card_id, _c.user_id, _merchant, _amount_usd, _btc, _rate, 'declined', _reason);
    RETURN jsonb_build_object('ok', false, 'declined', true, 'reason', _reason);
  END IF;

  UPDATE public.wallet_balances SET balance = _bal - _btc, updated_at = now()
    WHERE user_id = _c.user_id AND coin_symbol = 'BTC';

  INSERT INTO public.card_transactions(card_id, user_id, merchant, amount_usd, amount_btc, btc_rate, status)
  VALUES (_card_id, _c.user_id, _merchant, _amount_usd, _btc, _rate, 'approved');

  INSERT INTO public.transactions(user_id, type, from_symbol, amount, status, notes)
  VALUES (_c.user_id, 'card_purchase', 'BTC', _btc, 'completed',
          'CTT card purchase at ' || _merchant || ' ($' || _amount_usd::text || ')');

  RETURN jsonb_build_object('ok', true, 'btc', _btc, 'rate', _rate, 'newBalance', _bal - _btc);
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_card() FROM anon;
REVOKE ALL ON FUNCTION public.issue_virtual_card() FROM anon;
REVOKE ALL ON FUNCTION public.get_card_details(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.set_card_pin(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.set_card_status(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.card_spend(uuid, text, numeric) FROM anon;