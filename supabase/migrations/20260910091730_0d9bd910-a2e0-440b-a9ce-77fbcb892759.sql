CREATE OR REPLACE FUNCTION public.card_convert_btc_to_usdt(_card_id uuid, _amount_usd numeric, _investment_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _c public.virtual_cards;
  _rate numeric;
  _bal numeric;
  _btc numeric;
  _cash jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO _c FROM public.virtual_cards WHERE id = _card_id FOR UPDATE;
  IF _c.id IS NULL OR _c.user_id <> _uid THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF _c.status <> 'active' OR _c.activated_at IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'card_not_active');
  END IF;
  IF _amount_usd IS NULL OR _amount_usd <= 0 OR _amount_usd > 1000000 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_amount');
  END IF;

  _amount_usd := round(_amount_usd::numeric, 2);

  IF _investment_id IS NOT NULL THEN
    _cash := public.withdraw_investment_to_portfolio(_investment_id);
  END IF;

  SELECT price INTO _rate FROM public.coin_prices WHERE symbol = 'BTC';
  IF _rate IS NULL OR _rate <= 0 THEN RAISE EXCEPTION 'BTC price unavailable'; END IF;

  _btc := round((_amount_usd / _rate)::numeric, 8);

  SELECT balance INTO _bal FROM public.wallet_balances
    WHERE user_id = _uid AND coin_symbol = 'BTC' FOR UPDATE;
  _bal := COALESCE(_bal, 0);

  IF _bal < _btc THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'insufficient_btc',
      'availableBtc', _bal, 'availableUsd', round((_bal * _rate)::numeric, 2),
      'cashedOut', _cash
    );
  END IF;

  UPDATE public.wallet_balances
  SET balance = _bal - _btc, updated_at = now()
  WHERE user_id = _uid AND coin_symbol = 'BTC';

  UPDATE public.virtual_cards
  SET balance_usd = COALESCE(balance_usd, 0) + _amount_usd, updated_at = now()
  WHERE id = _c.id;

  INSERT INTO public.card_funding_requests(
    user_id, card_id, amount_usd, coin_symbol, network, deposit_address,
    status, admin_note, credited_at
  ) VALUES (
    _uid, _c.id, _amount_usd, 'BTC', 'Internal conversion',
    COALESCE(_c.deposit_address, 'internal'),
    'credited',
    'Converted ' || _btc::text || ' BTC to USDT at $' || _rate::text || ' and sent to card',
    now()
  );

  INSERT INTO public.transactions(user_id, type, from_symbol, to_symbol, amount, status, notes)
  VALUES (
    _uid, 'card_funding', 'BTC', 'USDT', _amount_usd, 'completed',
    'BTC converted to USDT and sent to CTT spend card ••' || _c.last4 ||
    ' (' || _btc::text || ' BTC at $' || _rate::text || ')'
  );

  PERFORM public.log_card_event(
    _c.id, 'convert_btc_to_card', true,
    'Converted $' || _amount_usd::text || ' worth of BTC to card balance', NULL
  );

  RETURN jsonb_build_object(
    'ok', true,
    'amountUsd', _amount_usd,
    'btc', _btc,
    'rate', _rate,
    'cardBalance', COALESCE(_c.balance_usd, 0) + _amount_usd,
    'cashedOut', _cash
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.card_convert_btc_to_usdt(uuid, numeric, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.card_convert_btc_to_usdt(uuid, numeric, uuid) TO authenticated, service_role;