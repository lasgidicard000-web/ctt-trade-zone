ALTER TABLE public.live_accounts
  ADD COLUMN IF NOT EXISTS frozen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS frozen_reason text;

CREATE OR REPLACE FUNCTION public.live_settings()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'enabled', true,
    'fee_pct', 0.1,
    'min_order_usd', 10,
    'min_funding_usd', 10,
    'min_withdrawal_usd', 10,
    'withdrawal_fee_pct', 1,
    'withdrawal_fee_min', 1
  ) || COALESCE((SELECT value FROM public.app_settings WHERE key = 'live_trading_settings'), '{}'::jsonb);
$$;

REVOKE ALL ON FUNCTION public.live_settings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.live_settings() TO authenticated, service_role;

-- guard helper: raises when live trading is off or the caller is frozen
CREATE OR REPLACE FUNCTION public.live_assert_enabled()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _s jsonb; _frozen boolean;
BEGIN
  _s := public.live_settings();
  IF COALESCE((_s->>'enabled')::boolean, true) = false THEN
    RAISE EXCEPTION 'live trading is disabled';
  END IF;
  SELECT frozen INTO _frozen FROM public.live_accounts WHERE user_id = auth.uid();
  IF COALESCE(_frozen, false) THEN
    RAISE EXCEPTION 'live trading is frozen for this account';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.live_assert_enabled() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.live_assert_enabled() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.live_place_order(_symbol text, _side text, _order_type text, _amount_usd numeric, _limit_price numeric DEFAULT NULL::numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _px numeric; _fee numeric; _qty numeric; _bal numeric;
  _h public.live_holdings; _pnl numeric := 0; _oid uuid;
  _s jsonb; _fee_rate numeric; _min_order numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  PERFORM public.live_assert_enabled();
  _s := public.live_settings();
  _fee_rate := COALESCE((_s->>'fee_pct')::numeric, 0.1) / 100.0;
  _min_order := COALESCE((_s->>'min_order_usd')::numeric, 10);

  IF _side NOT IN ('buy','sell') THEN RAISE EXCEPTION 'invalid side'; END IF;
  IF _order_type NOT IN ('market','limit') THEN RAISE EXCEPTION 'invalid order type'; END IF;
  IF _amount_usd IS NULL OR _amount_usd < _min_order THEN
    RAISE EXCEPTION 'minimum order is $%', _min_order;
  END IF;

  _px := public.live_price(_symbol);
  IF _px IS NULL OR _px <= 0 THEN RAISE EXCEPTION 'price unavailable'; END IF;

  PERFORM public.live_get_account();
  SELECT balance INTO _bal FROM public.live_accounts WHERE user_id = auth.uid() FOR UPDATE;

  IF _order_type = 'limit' THEN
    IF _limit_price IS NULL OR _limit_price <= 0 THEN RAISE EXCEPTION 'limit price required'; END IF;
    _qty := round((_amount_usd / _limit_price)::numeric, 8);
    IF _side = 'buy' AND _amount_usd * (1 + _fee_rate) > _bal THEN RAISE EXCEPTION 'insufficient live balance'; END IF;
    IF _side = 'sell' THEN
      SELECT * INTO _h FROM public.live_holdings WHERE user_id = auth.uid() AND coin_symbol = _symbol;
      IF COALESCE(_h.qty,0) < _qty THEN RAISE EXCEPTION 'insufficient %', _symbol; END IF;
    END IF;
    INSERT INTO public.live_orders(user_id, symbol, side, order_type, price, qty, amount_usd)
    VALUES (auth.uid(), _symbol, _side, 'limit', _limit_price, _qty, _amount_usd)
    RETURNING id INTO _oid;
    RETURN jsonb_build_object('ok', true, 'status', 'open', 'order_id', _oid, 'qty', _qty);
  END IF;

  _fee := round((_amount_usd * _fee_rate)::numeric, 2);
  _qty := round((_amount_usd / _px)::numeric, 8);

  IF _side = 'buy' THEN
    IF _amount_usd + _fee > _bal THEN RAISE EXCEPTION 'insufficient live balance'; END IF;
    UPDATE public.live_accounts SET balance = balance - _amount_usd - _fee, updated_at = now()
      WHERE user_id = auth.uid();
    INSERT INTO public.live_holdings(user_id, coin_symbol, qty, avg_price)
    VALUES (auth.uid(), _symbol, _qty, _px)
    ON CONFLICT (user_id, coin_symbol) DO UPDATE
      SET avg_price = CASE WHEN public.live_holdings.qty + _qty > 0
            THEN ((public.live_holdings.qty * public.live_holdings.avg_price) + (_qty * _px)) / (public.live_holdings.qty + _qty)
            ELSE _px END,
          qty = public.live_holdings.qty + _qty,
          updated_at = now();
  ELSE
    SELECT * INTO _h FROM public.live_holdings WHERE user_id = auth.uid() AND coin_symbol = _symbol FOR UPDATE;
    IF COALESCE(_h.qty,0) < _qty THEN RAISE EXCEPTION 'insufficient %', _symbol; END IF;
    _pnl := round(((_px - _h.avg_price) * _qty)::numeric, 2);
    UPDATE public.live_holdings SET qty = qty - _qty, updated_at = now() WHERE id = _h.id;
    UPDATE public.live_accounts
      SET balance = balance + _amount_usd - _fee,
          realized_pnl = realized_pnl + _pnl,
          updated_at = now()
      WHERE user_id = auth.uid();
  END IF;

  INSERT INTO public.live_orders(user_id, symbol, side, order_type, price, qty, amount_usd, status, filled_price, filled_at)
  VALUES (auth.uid(), _symbol, _side, 'market', _px, _qty, _amount_usd, 'filled', _px, now())
  RETURNING id INTO _oid;

  INSERT INTO public.live_trades(user_id, symbol, side, price, qty, amount_usd, fee, pnl)
  VALUES (auth.uid(), _symbol, _side, _px, _qty, _amount_usd, _fee, _pnl);

  RETURN jsonb_build_object('ok', true, 'status', 'filled', 'price', _px, 'qty', _qty, 'fee', _fee, 'pnl', _pnl);
END;
$function$;

CREATE OR REPLACE FUNCTION public.live_engine_tick()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _o public.live_orders; _px numeric; _fee numeric; _pnl numeric; _h public.live_holdings; _fills int := 0; _bal numeric;
        _s jsonb; _fee_rate numeric; _frozen boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('fills', 0); END IF;
  _s := public.live_settings();
  IF COALESCE((_s->>'enabled')::boolean, true) = false THEN RETURN jsonb_build_object('fills', 0, 'disabled', true); END IF;
  SELECT frozen INTO _frozen FROM public.live_accounts WHERE user_id = auth.uid();
  IF COALESCE(_frozen, false) THEN RETURN jsonb_build_object('fills', 0, 'frozen', true); END IF;
  _fee_rate := COALESCE((_s->>'fee_pct')::numeric, 0.1) / 100.0;

  FOR _o IN SELECT * FROM public.live_orders
            WHERE user_id = auth.uid() AND status = 'open' AND order_type = 'limit'
            ORDER BY created_at LOOP
    _px := public.live_price(_o.symbol);
    CONTINUE WHEN _px IS NULL OR _px <= 0;
    IF (_o.side = 'buy' AND _px <= _o.price) OR (_o.side = 'sell' AND _px >= _o.price) THEN
      _fee := round((_o.qty * _o.price * _fee_rate)::numeric, 2);
      _pnl := 0;
      SELECT balance INTO _bal FROM public.live_accounts WHERE user_id = auth.uid() FOR UPDATE;
      IF _o.side = 'buy' THEN
        IF _o.qty * _o.price + _fee > _bal THEN
          UPDATE public.live_orders SET status = 'cancelled' WHERE id = _o.id;
          CONTINUE;
        END IF;
        UPDATE public.live_accounts SET balance = balance - (_o.qty * _o.price) - _fee, updated_at = now()
          WHERE user_id = auth.uid();
        INSERT INTO public.live_holdings(user_id, coin_symbol, qty, avg_price)
        VALUES (auth.uid(), _o.symbol, _o.qty, _o.price)
        ON CONFLICT (user_id, coin_symbol) DO UPDATE
          SET avg_price = CASE WHEN public.live_holdings.qty + _o.qty > 0
                THEN ((public.live_holdings.qty * public.live_holdings.avg_price) + (_o.qty * _o.price)) / (public.live_holdings.qty + _o.qty)
                ELSE _o.price END,
              qty = public.live_holdings.qty + _o.qty,
              updated_at = now();
      ELSE
        SELECT * INTO _h FROM public.live_holdings WHERE user_id = auth.uid() AND coin_symbol = _o.symbol FOR UPDATE;
        IF COALESCE(_h.qty,0) < _o.qty THEN
          UPDATE public.live_orders SET status = 'cancelled' WHERE id = _o.id;
          CONTINUE;
        END IF;
        _pnl := round(((_o.price - _h.avg_price) * _o.qty)::numeric, 2);
        UPDATE public.live_holdings SET qty = qty - _o.qty, updated_at = now() WHERE id = _h.id;
        UPDATE public.live_accounts
          SET balance = balance + (_o.qty * _o.price) - _fee,
              realized_pnl = realized_pnl + _pnl, updated_at = now()
          WHERE user_id = auth.uid();
      END IF;
      UPDATE public.live_orders SET status = 'filled', filled_price = _o.price, filled_at = now() WHERE id = _o.id;
      INSERT INTO public.live_trades(user_id, symbol, side, price, qty, amount_usd, fee, pnl)
      VALUES (auth.uid(), _o.symbol, _o.side, _o.price, _o.qty, _o.qty * _o.price, _fee, _pnl);
      _fills := _fills + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('fills', _fills);
END;
$function$;

CREATE OR REPLACE FUNCTION public.live_fund_from_card(_card_id uuid, _amount_usd numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _res jsonb; _a public.live_accounts; _min numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  PERFORM public.live_assert_enabled();
  _min := COALESCE((public.live_settings()->>'min_funding_usd')::numeric, 10);
  IF _amount_usd IS NULL OR _amount_usd < _min THEN RAISE EXCEPTION 'minimum funding is $%', _min; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.virtual_cards WHERE id = _card_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  _res := public.card_spend(_card_id, 'CTT Live Trading Funding', _amount_usd);
  IF COALESCE((_res->>'ok')::boolean, false) = false THEN
    RETURN _res;
  END IF;

  _a := public.live_get_account();
  UPDATE public.live_accounts SET balance = balance + _amount_usd, updated_at = now()
    WHERE user_id = auth.uid() RETURNING * INTO _a;

  INSERT INTO public.live_funding(user_id, card_id, amount_usd, amount_btc, btc_rate)
  VALUES (auth.uid(), _card_id, _amount_usd, (_res->>'btc')::numeric, (_res->>'rate')::numeric);

  RETURN jsonb_build_object('ok', true, 'balance', _a.balance, 'btc', (_res->>'btc')::numeric);
END;
$function$;

CREATE OR REPLACE FUNCTION public.live_withdraw(_amount numeric, _address text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _bal numeric; _fee numeric; _addr text; _wid uuid; _s jsonb; _min numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  PERFORM public.live_assert_enabled();
  _s := public.live_settings();
  _min := COALESCE((_s->>'min_withdrawal_usd')::numeric, 10);
  _addr := btrim(COALESCE(_address, ''));
  IF length(_addr) < 20 OR length(_addr) > 120 THEN RAISE EXCEPTION 'invalid wallet address'; END IF;
  IF _addr ~ '^[0-9]+$' THEN RAISE EXCEPTION 'invalid wallet address'; END IF;
  IF _amount IS NULL OR _amount < _min THEN RAISE EXCEPTION 'minimum withdrawal is $%', _min; END IF;

  PERFORM public.live_get_account();
  SELECT balance INTO _bal FROM public.live_accounts WHERE user_id = auth.uid() FOR UPDATE;
  IF _amount > _bal THEN RAISE EXCEPTION 'insufficient live balance'; END IF;

  _fee := greatest(
    round((_amount * COALESCE((_s->>'withdrawal_fee_pct')::numeric, 1) / 100.0)::numeric, 2),
    COALESCE((_s->>'withdrawal_fee_min')::numeric, 1)
  );

  UPDATE public.live_accounts SET balance = balance - _amount, updated_at = now() WHERE user_id = auth.uid();

  INSERT INTO public.withdrawals(user_id, amount, wallet_address, fee, status, notes)
  VALUES (auth.uid(), _amount, _addr, _fee, 'pending', 'Live trading terminal withdrawal')
  RETURNING id INTO _wid;

  INSERT INTO public.transactions(user_id, type, from_symbol, amount, status, notes)
  VALUES (auth.uid(), 'withdrawal', 'USD', _amount, 'pending', 'Live trading withdrawal to ' || _addr);

  RETURN jsonb_build_object('ok', true, 'withdrawal_id', _wid, 'fee', _fee, 'net', _amount - _fee);
END;
$function$;

-- ===== admin controls =====
CREATE OR REPLACE FUNCTION public.admin_set_live_settings(_settings jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _before jsonb; _after jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT value INTO _before FROM public.app_settings WHERE key = 'live_trading_settings';
  _after := COALESCE(_before, '{}'::jsonb) || COALESCE(_settings, '{}'::jsonb)
            || jsonb_build_object('updated_by', auth.uid(), 'updated_at', now());

  INSERT INTO public.app_settings(key, value) VALUES ('live_trading_settings', _after)
  ON CONFLICT (key) DO UPDATE SET value = _after, updated_at = now();

  INSERT INTO public.admin_transaction_log(admin_user_id, action, target_table, before, after, reason)
  VALUES (auth.uid(), 'live_settings_update', 'app_settings', _before, _after, 'Live trading rules updated');

  RETURN jsonb_build_object('ok', true, 'settings', _after);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_live_settings(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_live_settings(jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_adjust_live_balance(_user_id uuid, _amount numeric, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _before numeric; _after numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF _amount IS NULL OR _amount = 0 THEN RAISE EXCEPTION 'amount required'; END IF;

  INSERT INTO public.live_accounts(user_id, balance) VALUES (_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO _before FROM public.live_accounts WHERE user_id = _user_id FOR UPDATE;
  UPDATE public.live_accounts SET balance = balance + _amount, updated_at = now()
    WHERE user_id = _user_id RETURNING balance INTO _after;

  INSERT INTO public.transactions(user_id, type, from_symbol, amount, status, notes)
  VALUES (_user_id, CASE WHEN _amount > 0 THEN 'deposit' ELSE 'withdrawal' END, 'USD', abs(_amount), 'completed',
          'Live trading balance adjustment: ' || COALESCE(_reason, 'admin adjustment'));

  INSERT INTO public.admin_transaction_log(admin_user_id, action, target_table, target_user_id, before, after, reason)
  VALUES (auth.uid(), 'live_balance_adjust', 'live_accounts', _user_id,
          jsonb_build_object('balance', _before), jsonb_build_object('balance', _after), _reason);

  RETURN jsonb_build_object('ok', true, 'balance', _after);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_adjust_live_balance(uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_live_balance(uuid, numeric, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_set_live_freeze(_user_id uuid, _frozen boolean, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;

  INSERT INTO public.live_accounts(user_id, balance) VALUES (_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.live_accounts
    SET frozen = COALESCE(_frozen, false),
        frozen_reason = CASE WHEN COALESCE(_frozen,false) THEN _reason ELSE NULL END,
        updated_at = now()
    WHERE user_id = _user_id;

  INSERT INTO public.admin_transaction_log(admin_user_id, action, target_table, target_user_id, after, reason)
  VALUES (auth.uid(), CASE WHEN COALESCE(_frozen,false) THEN 'live_freeze' ELSE 'live_unfreeze' END,
          'live_accounts', _user_id, jsonb_build_object('frozen', COALESCE(_frozen,false)), _reason);

  RETURN jsonb_build_object('ok', true, 'frozen', COALESCE(_frozen,false));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_live_freeze(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_live_freeze(uuid, boolean, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_close_live_holdings(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _h public.live_holdings; _px numeric; _pnl numeric; _proceeds numeric := 0; _closed int := 0; _total_pnl numeric := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;

  FOR _h IN SELECT * FROM public.live_holdings WHERE user_id = _user_id AND qty > 0.00000001 LOOP
    _px := public.live_price(_h.coin_symbol);
    CONTINUE WHEN _px IS NULL OR _px <= 0;
    _pnl := round(((_px - _h.avg_price) * _h.qty)::numeric, 2);
    _proceeds := _proceeds + round((_px * _h.qty)::numeric, 2);
    _total_pnl := _total_pnl + _pnl;

    INSERT INTO public.live_trades(user_id, symbol, side, price, qty, amount_usd, fee, pnl)
    VALUES (_user_id, _h.coin_symbol, 'sell', _px, _h.qty, round((_px * _h.qty)::numeric, 2), 0, _pnl);

    UPDATE public.live_holdings SET qty = 0, updated_at = now() WHERE id = _h.id;
    _closed := _closed + 1;
  END LOOP;

  UPDATE public.live_orders SET status = 'cancelled' WHERE user_id = _user_id AND status = 'open';

  IF _closed > 0 THEN
    INSERT INTO public.live_accounts(user_id, balance) VALUES (_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;
    UPDATE public.live_accounts
      SET balance = balance + _proceeds, realized_pnl = realized_pnl + _total_pnl, updated_at = now()
      WHERE user_id = _user_id;
  END IF;

  INSERT INTO public.admin_transaction_log(admin_user_id, action, target_table, target_user_id, after, reason)
  VALUES (auth.uid(), 'live_close_holdings', 'live_holdings', _user_id,
          jsonb_build_object('closed', _closed, 'proceeds', _proceeds, 'pnl', _total_pnl),
          'Admin force-closed live holdings');

  RETURN jsonb_build_object('ok', true, 'closed', _closed, 'proceeds', _proceeds, 'pnl', _total_pnl);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_close_live_holdings(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_close_live_holdings(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_list_live_accounts()
RETURNS TABLE(
  user_id uuid,
  display_name text,
  balance numeric,
  realized_pnl numeric,
  frozen boolean,
  frozen_reason text,
  holdings_value numeric,
  open_orders integer,
  trades_count integer,
  funded_total numeric,
  pending_withdrawals numeric,
  last_trade_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    a.user_id,
    p.display_name,
    a.balance,
    a.realized_pnl,
    a.frozen,
    a.frozen_reason,
    COALESCE((SELECT sum(h.qty * COALESCE(public.live_price(h.coin_symbol), 0))
              FROM public.live_holdings h WHERE h.user_id = a.user_id), 0) AS holdings_value,
    COALESCE((SELECT count(*) FROM public.live_orders o
              WHERE o.user_id = a.user_id AND o.status = 'open'), 0)::int AS open_orders,
    COALESCE((SELECT count(*) FROM public.live_trades t WHERE t.user_id = a.user_id), 0)::int AS trades_count,
    COALESCE((SELECT sum(f.amount_usd) FROM public.live_funding f WHERE f.user_id = a.user_id), 0) AS funded_total,
    COALESCE((SELECT sum(w.amount) FROM public.withdrawals w
              WHERE w.user_id = a.user_id AND w.status = 'pending' AND w.notes LIKE 'Live trading%'), 0) AS pending_withdrawals,
    (SELECT max(t.created_at) FROM public.live_trades t WHERE t.user_id = a.user_id) AS last_trade_at
  FROM public.live_accounts a
  LEFT JOIN public.profiles p ON p.user_id = a.user_id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY a.balance DESC;
$$;

REVOKE ALL ON FUNCTION public.admin_list_live_accounts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_live_accounts() TO authenticated, service_role;