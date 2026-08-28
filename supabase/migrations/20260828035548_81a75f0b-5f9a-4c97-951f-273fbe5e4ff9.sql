
-- =============== TABLES ===============
CREATE TABLE public.demo_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 10000,
  realized_pnl numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.demo_accounts TO authenticated;
GRANT ALL ON public.demo_accounts TO service_role;
ALTER TABLE public.demo_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo_accounts_select_own" ON public.demo_accounts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.demo_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  market text NOT NULL DEFAULT 'spot',
  side text NOT NULL,
  order_type text NOT NULL DEFAULT 'market',
  price numeric,
  qty numeric NOT NULL,
  amount_usd numeric NOT NULL,
  leverage integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'open',
  filled_price numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  filled_at timestamptz
);
GRANT SELECT ON public.demo_orders TO authenticated;
GRANT ALL ON public.demo_orders TO service_role;
ALTER TABLE public.demo_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo_orders_select_own" ON public.demo_orders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX demo_orders_user_status_idx ON public.demo_orders (user_id, status);

CREATE TABLE public.demo_positions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  market text NOT NULL DEFAULT 'spot',
  side text NOT NULL,
  entry_price numeric NOT NULL,
  qty numeric NOT NULL,
  leverage integer NOT NULL DEFAULT 1,
  margin numeric NOT NULL,
  liq_price numeric,
  status text NOT NULL DEFAULT 'open',
  pnl numeric NOT NULL DEFAULT 0,
  close_price numeric,
  close_reason text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
GRANT SELECT ON public.demo_positions TO authenticated;
GRANT ALL ON public.demo_positions TO service_role;
ALTER TABLE public.demo_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo_positions_select_own" ON public.demo_positions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX demo_positions_user_status_idx ON public.demo_positions (user_id, status);

CREATE TABLE public.demo_trades (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  market text NOT NULL,
  side text NOT NULL,
  price numeric NOT NULL,
  qty numeric NOT NULL,
  amount_usd numeric NOT NULL,
  fee numeric NOT NULL DEFAULT 0,
  pnl numeric NOT NULL DEFAULT 0,
  kind text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.demo_trades TO authenticated;
GRANT ALL ON public.demo_trades TO service_role;
ALTER TABLE public.demo_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo_trades_select_own" ON public.demo_trades FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX demo_trades_user_idx ON public.demo_trades (user_id, created_at DESC);

CREATE TABLE public.trading_bots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  strategy text NOT NULL,
  symbol text NOT NULL,
  investment numeric NOT NULL,
  status text NOT NULL DEFAULT 'running',
  grid_lower numeric,
  grid_upper numeric,
  grid_count integer,
  interval_minutes integer NOT NULL DEFAULT 5,
  safety_orders integer,
  take_profit_pct numeric,
  stop_loss_pct numeric,
  pnl numeric NOT NULL DEFAULT 0,
  trades_count integer NOT NULL DEFAULT 0,
  last_tick_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  stopped_at timestamptz
);
GRANT SELECT ON public.trading_bots TO authenticated;
GRANT ALL ON public.trading_bots TO service_role;
ALTER TABLE public.trading_bots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trading_bots_select_own" ON public.trading_bots FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_trading_bots_updated_at BEFORE UPDATE ON public.trading_bots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.bot_trades (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id uuid NOT NULL REFERENCES public.trading_bots(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  side text NOT NULL,
  price numeric NOT NULL,
  qty numeric NOT NULL,
  amount_usd numeric NOT NULL,
  pnl numeric NOT NULL DEFAULT 0,
  equity numeric,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bot_trades TO authenticated;
GRANT ALL ON public.bot_trades TO service_role;
ALTER TABLE public.bot_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bot_trades_select_own" ON public.bot_trades FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX bot_trades_bot_idx ON public.bot_trades (bot_id, created_at DESC);

-- =============== HELPERS ===============
CREATE OR REPLACE FUNCTION public.demo_price(_symbol text)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT price FROM public.coin_prices WHERE symbol = upper(_symbol) LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.demo_get_account()
RETURNS public.demo_accounts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _a public.demo_accounts;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO _a FROM public.demo_accounts WHERE user_id = auth.uid();
  IF _a.id IS NULL THEN
    INSERT INTO public.demo_accounts(user_id) VALUES (auth.uid()) RETURNING * INTO _a;
  END IF;
  RETURN _a;
END; $$;

CREATE OR REPLACE FUNCTION public.demo_reset_account()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  DELETE FROM public.bot_trades WHERE user_id = _uid;
  DELETE FROM public.trading_bots WHERE user_id = _uid;
  DELETE FROM public.demo_trades WHERE user_id = _uid;
  DELETE FROM public.demo_positions WHERE user_id = _uid;
  DELETE FROM public.demo_orders WHERE user_id = _uid;
  INSERT INTO public.demo_accounts(user_id, balance, realized_pnl)
  VALUES (_uid, 10000, 0)
  ON CONFLICT (user_id) DO UPDATE SET balance = 10000, realized_pnl = 0, updated_at = now();
  RETURN jsonb_build_object('ok', true, 'balance', 10000);
END; $$;

-- =============== ORDER PLACEMENT ===============
CREATE OR REPLACE FUNCTION public.demo_place_order(
  _symbol text, _market text, _side text, _order_type text,
  _amount_usd numeric, _limit_price numeric DEFAULT NULL, _leverage integer DEFAULT 1
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _a public.demo_accounts;
  _px numeric; _fee numeric; _qty numeric; _lev integer; _liq numeric;
  _order_id uuid; _pos_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  _symbol := upper(btrim(_symbol));
  IF _market NOT IN ('spot','futures') THEN RAISE EXCEPTION 'invalid market'; END IF;
  IF _order_type NOT IN ('market','limit') THEN RAISE EXCEPTION 'invalid order type'; END IF;
  IF _market = 'spot' AND _side NOT IN ('buy','sell') THEN RAISE EXCEPTION 'invalid side'; END IF;
  IF _market = 'futures' AND _side NOT IN ('long','short') THEN RAISE EXCEPTION 'invalid side'; END IF;
  IF _amount_usd IS NULL OR _amount_usd < 10 THEN RAISE EXCEPTION 'minimum order size is 10 USDT'; END IF;

  _lev := CASE WHEN _market = 'futures' THEN GREATEST(1, LEAST(50, COALESCE(_leverage,1))) ELSE 1 END;

  _px := public.demo_price(_symbol);
  IF _px IS NULL OR _px <= 0 THEN RAISE EXCEPTION 'price unavailable for %', _symbol; END IF;

  _a := public.demo_get_account();
  IF _a.balance < _amount_usd THEN RAISE EXCEPTION 'insufficient demo balance'; END IF;

  IF _order_type = 'limit' THEN
    IF _limit_price IS NULL OR _limit_price <= 0 THEN RAISE EXCEPTION 'limit price required'; END IF;
    _qty := round((_amount_usd * _lev / _limit_price)::numeric, 8);
    UPDATE public.demo_accounts SET balance = balance - _amount_usd, updated_at = now() WHERE user_id = _uid;
    INSERT INTO public.demo_orders(user_id, symbol, market, side, order_type, price, qty, amount_usd, leverage, status)
    VALUES (_uid, _symbol, _market, _side, 'limit', _limit_price, _qty, _amount_usd, _lev, 'open')
    RETURNING id INTO _order_id;
    RETURN jsonb_build_object('ok', true, 'status', 'open', 'orderId', _order_id, 'qty', _qty);
  END IF;

  -- market order fills immediately
  _fee := round((_amount_usd * _lev * CASE WHEN _market = 'futures' THEN 0.0006 ELSE 0.001 END)::numeric, 4);
  _qty := round((_amount_usd * _lev / _px)::numeric, 8);
  _liq := CASE
    WHEN _market <> 'futures' THEN NULL
    WHEN _side = 'long' THEN round((_px * (1 - 0.9 / _lev))::numeric, 8)
    ELSE round((_px * (1 + 0.9 / _lev))::numeric, 8)
  END;

  UPDATE public.demo_accounts SET balance = balance - _amount_usd - _fee, updated_at = now() WHERE user_id = _uid;

  INSERT INTO public.demo_orders(user_id, symbol, market, side, order_type, price, qty, amount_usd, leverage, status, filled_price, filled_at)
  VALUES (_uid, _symbol, _market, _side, 'market', _px, _qty, _amount_usd, _lev, 'filled', _px, now())
  RETURNING id INTO _order_id;

  INSERT INTO public.demo_positions(user_id, symbol, market, side, entry_price, qty, leverage, margin, liq_price)
  VALUES (_uid, _symbol, _market, _side, _px, _qty, _lev, _amount_usd, _liq)
  RETURNING id INTO _pos_id;

  INSERT INTO public.demo_trades(user_id, symbol, market, side, price, qty, amount_usd, fee, kind)
  VALUES (_uid, _symbol, _market, _side, _px, _qty, _amount_usd * _lev, _fee, 'open');

  RETURN jsonb_build_object('ok', true, 'status', 'filled', 'orderId', _order_id, 'positionId', _pos_id, 'price', _px, 'qty', _qty, 'fee', _fee);
END; $$;

CREATE OR REPLACE FUNCTION public.demo_cancel_order(_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o public.demo_orders;
BEGIN
  SELECT * INTO _o FROM public.demo_orders WHERE id = _order_id FOR UPDATE;
  IF _o.id IS NULL OR _o.user_id <> auth.uid() THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF _o.status <> 'open' THEN RAISE EXCEPTION 'order is not open'; END IF;
  UPDATE public.demo_orders SET status = 'cancelled' WHERE id = _order_id;
  UPDATE public.demo_accounts SET balance = balance + _o.amount_usd, updated_at = now() WHERE user_id = _o.user_id;
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.demo_close_position(_position_id uuid, _reason text DEFAULT 'manual')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p public.demo_positions; _px numeric; _pnl numeric; _fee numeric; _ret numeric;
BEGIN
  SELECT * INTO _p FROM public.demo_positions WHERE id = _position_id FOR UPDATE;
  IF _p.id IS NULL OR _p.user_id <> auth.uid() THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF _p.status <> 'open' THEN RAISE EXCEPTION 'position already closed'; END IF;

  _px := public.demo_price(_p.symbol);
  IF _px IS NULL OR _px <= 0 THEN RAISE EXCEPTION 'price unavailable'; END IF;

  IF _p.side IN ('long','buy') THEN
    _pnl := (_px - _p.entry_price) * _p.qty;
  ELSE
    _pnl := (_p.entry_price - _px) * _p.qty;
  END IF;
  _pnl := round(_pnl::numeric, 2);
  _fee := round((_px * _p.qty * CASE WHEN _p.market = 'futures' THEN 0.0006 ELSE 0.001 END)::numeric, 4);
  _ret := GREATEST(0, _p.margin + _pnl - _fee);

  UPDATE public.demo_positions
  SET status = 'closed', pnl = _pnl, close_price = _px, close_reason = _reason, closed_at = now()
  WHERE id = _position_id;

  UPDATE public.demo_accounts
  SET balance = balance + _ret, realized_pnl = realized_pnl + _pnl - _fee, updated_at = now()
  WHERE user_id = _p.user_id;

  INSERT INTO public.demo_trades(user_id, symbol, market, side, price, qty, amount_usd, fee, pnl, kind)
  VALUES (_p.user_id, _p.symbol, _p.market,
          CASE WHEN _p.side IN ('long','buy') THEN 'sell' ELSE 'buy' END,
          _px, _p.qty, round((_px * _p.qty)::numeric, 2), _fee, _pnl, 'close');

  RETURN jsonb_build_object('ok', true, 'pnl', _pnl, 'price', _px, 'returned', _ret);
END; $$;

-- =============== ENGINE TICK (limit fills, liquidations, bots) ===============
CREATE OR REPLACE FUNCTION public.demo_engine_tick()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  o record; p record; b record;
  _px numeric; _fee numeric; _liq numeric; _pnl numeric; _ret numeric;
  _fills int := 0; _liqs int := 0; _bot_trades int := 0;
  _drift numeric; _qty numeric; _equity numeric; _roi numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  -- 1. limit order fills
  FOR o IN SELECT * FROM public.demo_orders WHERE user_id = _uid AND status = 'open' FOR UPDATE LOOP
    _px := public.demo_price(o.symbol);
    CONTINUE WHEN _px IS NULL;
    IF (o.side IN ('buy','long') AND _px <= o.price) OR (o.side IN ('sell','short') AND _px >= o.price) THEN
      _fee := round((o.amount_usd * o.leverage * CASE WHEN o.market = 'futures' THEN 0.0006 ELSE 0.001 END)::numeric, 4);
      _liq := CASE
        WHEN o.market <> 'futures' THEN NULL
        WHEN o.side = 'long' THEN round((o.price * (1 - 0.9 / o.leverage))::numeric, 8)
        ELSE round((o.price * (1 + 0.9 / o.leverage))::numeric, 8)
      END;
      UPDATE public.demo_orders SET status = 'filled', filled_price = o.price, filled_at = now() WHERE id = o.id;
      UPDATE public.demo_accounts SET balance = GREATEST(0, balance - _fee), updated_at = now() WHERE user_id = _uid;
      INSERT INTO public.demo_positions(user_id, symbol, market, side, entry_price, qty, leverage, margin, liq_price)
      VALUES (_uid, o.symbol, o.market, o.side, o.price, o.qty, o.leverage, o.amount_usd, _liq);
      INSERT INTO public.demo_trades(user_id, symbol, market, side, price, qty, amount_usd, fee, kind)
      VALUES (_uid, o.symbol, o.market, o.side, o.price, o.qty, o.amount_usd * o.leverage, _fee, 'open');
      _fills := _fills + 1;
    END IF;
  END LOOP;

  -- 2. liquidations
  FOR p IN SELECT * FROM public.demo_positions
           WHERE user_id = _uid AND status = 'open' AND market = 'futures' AND liq_price IS NOT NULL FOR UPDATE LOOP
    _px := public.demo_price(p.symbol);
    CONTINUE WHEN _px IS NULL;
    IF (p.side = 'long' AND _px <= p.liq_price) OR (p.side = 'short' AND _px >= p.liq_price) THEN
      _pnl := round((-1 * p.margin)::numeric, 2);
      UPDATE public.demo_positions
      SET status = 'closed', pnl = _pnl, close_price = _px, close_reason = 'liquidated', closed_at = now()
      WHERE id = p.id;
      UPDATE public.demo_accounts SET realized_pnl = realized_pnl + _pnl, updated_at = now() WHERE user_id = _uid;
      INSERT INTO public.demo_trades(user_id, symbol, market, side, price, qty, amount_usd, fee, pnl, kind)
      VALUES (_uid, p.symbol, p.market, CASE WHEN p.side = 'long' THEN 'sell' ELSE 'buy' END,
              _px, p.qty, round((_px * p.qty)::numeric, 2), 0, _pnl, 'liquidation');
      _liqs := _liqs + 1;
    END IF;
  END LOOP;

  -- 3. bot execution
  FOR b IN SELECT * FROM public.trading_bots WHERE user_id = _uid AND status = 'running' FOR UPDATE LOOP
    IF b.last_tick_at IS NOT NULL AND now() < b.last_tick_at + (b.interval_minutes || ' minutes')::interval THEN
      CONTINUE;
    END IF;
    _px := public.demo_price(b.symbol);
    CONTINUE WHEN _px IS NULL OR _px <= 0;

    _drift := CASE b.strategy
      WHEN 'grid' THEN 0.0018
      WHEN 'dca' THEN 0.0022
      WHEN 'martingale' THEN 0.0045
      ELSE 0.0032
    END;
    -- slightly positive expectancy, random per fill
    _pnl := round((b.investment * ((random() - 0.42) * 2 * _drift))::numeric, 2);
    _qty := round((b.investment / _px)::numeric, 8);

    UPDATE public.trading_bots
    SET pnl = pnl + _pnl, trades_count = trades_count + 1, last_tick_at = now()
    WHERE id = b.id;

    _equity := b.investment + b.pnl + _pnl;

    INSERT INTO public.bot_trades(bot_id, user_id, side, price, qty, amount_usd, pnl, equity, note)
    VALUES (b.id, _uid, CASE WHEN _pnl >= 0 THEN 'sell' ELSE 'buy' END,
            _px, _qty, round((b.investment)::numeric, 2), _pnl, round(_equity::numeric, 2),
            b.strategy || ' cycle executed');
    _bot_trades := _bot_trades + 1;

    _roi := CASE WHEN b.investment > 0 THEN (b.pnl + _pnl) / b.investment * 100 ELSE 0 END;
    IF (b.take_profit_pct IS NOT NULL AND _roi >= b.take_profit_pct)
       OR (b.stop_loss_pct IS NOT NULL AND _roi <= -1 * b.stop_loss_pct) THEN
      UPDATE public.trading_bots SET status = 'stopped', stopped_at = now() WHERE id = b.id;
      UPDATE public.demo_accounts
      SET balance = balance + GREATEST(0, b.investment + b.pnl + _pnl),
          realized_pnl = realized_pnl + b.pnl + _pnl,
          updated_at = now()
      WHERE user_id = _uid;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'fills', _fills, 'liquidations', _liqs, 'botTrades', _bot_trades);
END; $$;

-- =============== BOT MANAGEMENT ===============
CREATE OR REPLACE FUNCTION public.bot_create(
  _name text, _strategy text, _symbol text, _investment numeric,
  _grid_lower numeric DEFAULT NULL, _grid_upper numeric DEFAULT NULL, _grid_count integer DEFAULT NULL,
  _interval_minutes integer DEFAULT 5, _safety_orders integer DEFAULT NULL,
  _take_profit_pct numeric DEFAULT NULL, _stop_loss_pct numeric DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _a public.demo_accounts; _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _strategy NOT IN ('grid','dca','martingale','ai_trend') THEN RAISE EXCEPTION 'invalid strategy'; END IF;
  IF _name IS NULL OR length(btrim(_name)) = 0 OR length(_name) > 60 THEN RAISE EXCEPTION 'bot name is required'; END IF;
  IF _investment IS NULL OR _investment < 100 THEN RAISE EXCEPTION 'minimum bot investment is 100 USDT'; END IF;
  IF public.demo_price(upper(btrim(_symbol))) IS NULL THEN RAISE EXCEPTION 'unsupported pair'; END IF;

  _a := public.demo_get_account();
  IF _a.balance < _investment THEN RAISE EXCEPTION 'insufficient demo balance'; END IF;

  UPDATE public.demo_accounts SET balance = balance - _investment, updated_at = now() WHERE user_id = _uid;

  INSERT INTO public.trading_bots(
    user_id, name, strategy, symbol, investment, status,
    grid_lower, grid_upper, grid_count, interval_minutes, safety_orders,
    take_profit_pct, stop_loss_pct, last_tick_at
  ) VALUES (
    _uid, btrim(_name), _strategy, upper(btrim(_symbol)), _investment, 'running',
    _grid_lower, _grid_upper, _grid_count, GREATEST(1, LEAST(1440, COALESCE(_interval_minutes,5))), _safety_orders,
    _take_profit_pct, _stop_loss_pct, NULL
  ) RETURNING id INTO _id;

  RETURN jsonb_build_object('ok', true, 'botId', _id);
END; $$;

CREATE OR REPLACE FUNCTION public.bot_set_status(_bot_id uuid, _status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _b public.trading_bots; _payout numeric;
BEGIN
  IF _status NOT IN ('running','paused','stopped') THEN RAISE EXCEPTION 'invalid status'; END IF;
  SELECT * INTO _b FROM public.trading_bots WHERE id = _bot_id FOR UPDATE;
  IF _b.id IS NULL OR _b.user_id <> auth.uid() THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF _b.status = 'stopped' THEN RAISE EXCEPTION 'bot already stopped'; END IF;

  IF _status = 'stopped' THEN
    _payout := GREATEST(0, round((_b.investment + _b.pnl)::numeric, 2));
    UPDATE public.trading_bots SET status = 'stopped', stopped_at = now() WHERE id = _bot_id;
    UPDATE public.demo_accounts
    SET balance = balance + _payout, realized_pnl = realized_pnl + _b.pnl, updated_at = now()
    WHERE user_id = _b.user_id;
    RETURN jsonb_build_object('ok', true, 'status', 'stopped', 'returned', _payout);
  END IF;

  UPDATE public.trading_bots
  SET status = _status, last_tick_at = CASE WHEN _status = 'running' THEN now() ELSE last_tick_at END
  WHERE id = _bot_id;
  RETURN jsonb_build_object('ok', true, 'status', _status);
END; $$;
