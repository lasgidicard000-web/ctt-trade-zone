
-- ============ TABLES ============
CREATE TABLE public.live_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  realized_pnl numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.live_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  coin_symbol text NOT NULL,
  qty numeric NOT NULL DEFAULT 0,
  avg_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, coin_symbol)
);

CREATE TABLE public.live_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  side text NOT NULL,
  order_type text NOT NULL,
  price numeric,
  qty numeric NOT NULL,
  amount_usd numeric NOT NULL,
  status text NOT NULL DEFAULT 'open',
  filled_price numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  filled_at timestamptz
);

CREATE TABLE public.live_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  side text NOT NULL,
  price numeric NOT NULL,
  qty numeric NOT NULL,
  amount_usd numeric NOT NULL,
  fee numeric NOT NULL DEFAULT 0,
  pnl numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.live_funding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  card_id uuid NOT NULL REFERENCES public.virtual_cards(id) ON DELETE CASCADE,
  amount_usd numeric NOT NULL,
  amount_btc numeric NOT NULL,
  btc_rate numeric NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ GRANTS ============
GRANT SELECT ON public.live_accounts TO authenticated;
GRANT SELECT ON public.live_holdings TO authenticated;
GRANT SELECT ON public.live_orders TO authenticated;
GRANT SELECT ON public.live_trades TO authenticated;
GRANT SELECT ON public.live_funding TO authenticated;
GRANT ALL ON public.live_accounts TO service_role;
GRANT ALL ON public.live_holdings TO service_role;
GRANT ALL ON public.live_orders TO service_role;
GRANT ALL ON public.live_trades TO service_role;
GRANT ALL ON public.live_funding TO service_role;

-- ============ RLS ============
ALTER TABLE public.live_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_funding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own live account" ON public.live_accounts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own live holdings" ON public.live_holdings FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own live orders" ON public.live_orders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own live trades" ON public.live_trades FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own live funding" ON public.live_funding FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER live_accounts_updated BEFORE UPDATE ON public.live_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER live_holdings_updated BEFORE UPDATE ON public.live_holdings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.live_price(_symbol text)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT price FROM public.coin_prices WHERE symbol = _symbol LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.live_get_account()
RETURNS public.live_accounts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _a public.live_accounts;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO _a FROM public.live_accounts WHERE user_id = auth.uid();
  IF _a.id IS NULL THEN
    INSERT INTO public.live_accounts(user_id, balance) VALUES (auth.uid(), 0)
    ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
    RETURNING * INTO _a;
  END IF;
  RETURN _a;
END;
$$;

-- ============ FUNDING (card only) ============
CREATE OR REPLACE FUNCTION public.live_fund_from_card(_card_id uuid, _amount_usd numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _res jsonb; _a public.live_accounts;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _amount_usd IS NULL OR _amount_usd < 10 THEN RAISE EXCEPTION 'minimum funding is $10'; END IF;
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
$$;

-- ============ ORDERS ============
CREATE OR REPLACE FUNCTION public.live_place_order(
  _symbol text, _side text, _order_type text, _amount_usd numeric, _limit_price numeric DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _px numeric; _fee numeric; _qty numeric; _bal numeric;
  _h public.live_holdings; _pnl numeric := 0; _oid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _side NOT IN ('buy','sell') THEN RAISE EXCEPTION 'invalid side'; END IF;
  IF _order_type NOT IN ('market','limit') THEN RAISE EXCEPTION 'invalid order type'; END IF;
  IF _amount_usd IS NULL OR _amount_usd < 10 THEN RAISE EXCEPTION 'minimum order is $10'; END IF;

  _px := public.live_price(_symbol);
  IF _px IS NULL OR _px <= 0 THEN RAISE EXCEPTION 'price unavailable'; END IF;

  PERFORM public.live_get_account();
  SELECT balance INTO _bal FROM public.live_accounts WHERE user_id = auth.uid() FOR UPDATE;

  IF _order_type = 'limit' THEN
    IF _limit_price IS NULL OR _limit_price <= 0 THEN RAISE EXCEPTION 'limit price required'; END IF;
    _qty := round((_amount_usd / _limit_price)::numeric, 8);
    IF _side = 'buy' AND _amount_usd * 1.001 > _bal THEN RAISE EXCEPTION 'insufficient live balance'; END IF;
    IF _side = 'sell' THEN
      SELECT * INTO _h FROM public.live_holdings WHERE user_id = auth.uid() AND coin_symbol = _symbol;
      IF COALESCE(_h.qty,0) < _qty THEN RAISE EXCEPTION 'insufficient %', _symbol; END IF;
    END IF;
    INSERT INTO public.live_orders(user_id, symbol, side, order_type, price, qty, amount_usd)
    VALUES (auth.uid(), _symbol, _side, 'limit', _limit_price, _qty, _amount_usd)
    RETURNING id INTO _oid;
    RETURN jsonb_build_object('ok', true, 'status', 'open', 'order_id', _oid, 'qty', _qty);
  END IF;

  -- market order
  _fee := round((_amount_usd * 0.001)::numeric, 2);
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
$$;

CREATE OR REPLACE FUNCTION public.live_cancel_order(_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.live_orders SET status = 'cancelled'
    WHERE id = _order_id AND user_id = auth.uid() AND status = 'open';
  IF NOT FOUND THEN RAISE EXCEPTION 'order not open'; END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.live_engine_tick()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o public.live_orders; _px numeric; _fee numeric; _pnl numeric; _h public.live_holdings; _fills int := 0; _bal numeric;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('fills', 0); END IF;
  FOR _o IN SELECT * FROM public.live_orders
            WHERE user_id = auth.uid() AND status = 'open' AND order_type = 'limit'
            ORDER BY created_at LOOP
    _px := public.live_price(_o.symbol);
    CONTINUE WHEN _px IS NULL OR _px <= 0;
    IF (_o.side = 'buy' AND _px <= _o.price) OR (_o.side = 'sell' AND _px >= _o.price) THEN
      _fee := round((_o.qty * _o.price * 0.001)::numeric, 2);
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
$$;

-- ============ WITHDRAWAL ============
CREATE OR REPLACE FUNCTION public.live_withdraw(_amount numeric, _address text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bal numeric; _fee numeric; _addr text; _wid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  _addr := btrim(COALESCE(_address, ''));
  IF length(_addr) < 20 OR length(_addr) > 120 THEN RAISE EXCEPTION 'invalid wallet address'; END IF;
  IF _addr ~ '^[0-9]+$' THEN RAISE EXCEPTION 'invalid wallet address'; END IF;
  IF _amount IS NULL OR _amount < 10 THEN RAISE EXCEPTION 'minimum withdrawal is $10'; END IF;

  PERFORM public.live_get_account();
  SELECT balance INTO _bal FROM public.live_accounts WHERE user_id = auth.uid() FOR UPDATE;
  IF _amount > _bal THEN RAISE EXCEPTION 'insufficient live balance'; END IF;

  _fee := greatest(round((_amount * 0.01)::numeric, 2), 1);

  UPDATE public.live_accounts SET balance = balance - _amount, updated_at = now() WHERE user_id = auth.uid();

  INSERT INTO public.withdrawals(user_id, amount, wallet_address, fee, status, notes)
  VALUES (auth.uid(), _amount, _addr, _fee, 'pending', 'Live trading terminal withdrawal')
  RETURNING id INTO _wid;

  INSERT INTO public.transactions(user_id, type, from_symbol, amount, status, notes)
  VALUES (auth.uid(), 'withdrawal', 'USD', _amount, 'pending', 'Live trading withdrawal to ' || _addr);

  RETURN jsonb_build_object('ok', true, 'withdrawal_id', _wid, 'fee', _fee, 'net', _amount - _fee);
END;
$$;

-- ============ EXECUTE GRANTS ============
REVOKE ALL ON FUNCTION public.live_price(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.live_get_account() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.live_fund_from_card(uuid, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.live_place_order(text, text, text, numeric, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.live_cancel_order(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.live_engine_tick() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.live_withdraw(numeric, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.live_price(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.live_get_account() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.live_fund_from_card(uuid, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.live_place_order(text, text, text, numeric, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.live_cancel_order(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.live_engine_tick() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.live_withdraw(numeric, text) TO authenticated, service_role;
