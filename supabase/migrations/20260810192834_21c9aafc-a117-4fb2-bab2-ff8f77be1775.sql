CREATE OR REPLACE FUNCTION public.withdraw_investment_to_portfolio(_investment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv public.user_investments;
  _uid uuid := auth.uid();
  _roi_sum numeric;
  _elapsed_days numeric;
  _profit numeric;
  _total numeric;
  _rate numeric;
  _btc numeric;
  _bal numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO _inv FROM public.user_investments WHERE id = _investment_id FOR UPDATE;
  IF _inv.id IS NULL OR _inv.user_id <> _uid THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _inv.status <> 'active' THEN
    RAISE EXCEPTION 'plan is not active';
  END IF;

  SELECT sum(roi) INTO _roi_sum FROM public.investment_daily_roi WHERE investment_id = _investment_id;

  IF _roi_sum IS NOT NULL THEN
    _profit := _inv.amount * _roi_sum;
  ELSE
    _elapsed_days := GREATEST(0, EXTRACT(epoch FROM (now() - _inv.started_at)) / 86400.0);
    _profit := _inv.amount * _inv.daily_roi * _elapsed_days;
  END IF;

  _profit := round(GREATEST(0, _profit)::numeric, 2);
  _total := round((_inv.amount + _profit)::numeric, 2);

  SELECT price INTO _rate FROM public.coin_prices WHERE symbol = 'BTC';
  IF _rate IS NULL OR _rate <= 0 THEN RAISE EXCEPTION 'BTC price unavailable'; END IF;
  _btc := round((_total / _rate)::numeric, 8);

  SELECT balance INTO _bal FROM public.wallet_balances
    WHERE user_id = _uid AND coin_symbol = 'BTC' FOR UPDATE;
  _bal := COALESCE(_bal, 0);

  INSERT INTO public.wallet_balances(user_id, coin_symbol, balance)
  VALUES (_uid, 'BTC', _bal + _btc)
  ON CONFLICT (user_id, coin_symbol) DO UPDATE SET balance = EXCLUDED.balance, updated_at = now();

  UPDATE public.user_investments
  SET status = 'withdrawn', ends_at = now()
  WHERE id = _investment_id;

  INSERT INTO public.transactions(user_id, type, to_symbol, amount, status, notes)
  VALUES (
    _uid, 'plan_cashout', 'BTC', _btc, 'completed',
    'Plan cash-out - ' || _inv.plan_name || ': capital $' || _inv.amount::text ||
    ' + profit $' || _profit::text || ' = $' || _total::text || ' credited to portfolio balance'
  );

  RETURN jsonb_build_object(
    'ok', true,
    'principal', _inv.amount,
    'profit', _profit,
    'totalUsd', _total,
    'btc', _btc,
    'rate', _rate
  );
END;
$$;