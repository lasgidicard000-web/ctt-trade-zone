CREATE TABLE public.field_marshal_gas_balances (
  user_id uuid PRIMARY KEY,
  balance_usd numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.field_marshal_gas_balances TO authenticated;
GRANT ALL ON public.field_marshal_gas_balances TO service_role;
ALTER TABLE public.field_marshal_gas_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own TRON gas balance" ON public.field_marshal_gas_balances
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.field_marshal_gas_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_usd numeric NOT NULL,
  entry_type text NOT NULL CHECK (entry_type IN ('deposit','withdrawal_fee','fee_refund','admin_adjustment')),
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending','confirmed','rejected')),
  transaction_hash text,
  withdrawal_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.field_marshal_gas_ledger TO authenticated;
GRANT ALL ON public.field_marshal_gas_ledger TO service_role;
ALTER TABLE public.field_marshal_gas_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own TRON gas ledger" ON public.field_marshal_gas_ledger
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE UNIQUE INDEX field_marshal_gas_ledger_tx_hash_unique
  ON public.field_marshal_gas_ledger (transaction_hash) WHERE transaction_hash IS NOT NULL;
CREATE INDEX field_marshal_gas_ledger_user_created_idx
  ON public.field_marshal_gas_ledger (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.field_marshal_gas_balance(_user_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> _user_id AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN COALESCE((SELECT balance_usd FROM public.field_marshal_gas_balances WHERE user_id = _user_id), 0);
END;
$$;
REVOKE ALL ON FUNCTION public.field_marshal_gas_balance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.field_marshal_gas_balance(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_credit_field_marshal_gas(
  _user_id uuid, _amount_usd numeric, _transaction_hash text, _note text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _hash text; _new_balance numeric;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF _user_id IS NULL OR _amount_usd IS NULL OR _amount_usd <= 0 THEN RAISE EXCEPTION 'invalid gas credit'; END IF;
  _hash := lower(btrim(COALESCE(_transaction_hash, '')));
  IF _hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'valid TRON transaction hash required'; END IF;
  INSERT INTO public.field_marshal_gas_balances(user_id, balance_usd)
    VALUES (_user_id, _amount_usd)
    ON CONFLICT (user_id) DO UPDATE SET balance_usd = field_marshal_gas_balances.balance_usd + EXCLUDED.balance_usd, updated_at = now()
    RETURNING balance_usd INTO _new_balance;
  INSERT INTO public.field_marshal_gas_ledger(user_id, amount_usd, entry_type, status, transaction_hash, note)
    VALUES (_user_id, _amount_usd, 'deposit', 'confirmed', _hash, COALESCE(_note, 'TRON deposit verified on-chain'));
  RETURN jsonb_build_object('balance_usd', _new_balance);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_credit_field_marshal_gas(uuid,numeric,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_credit_field_marshal_gas(uuid,numeric,text,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.field_marshal_reserve_gas_fee(_user_id uuid, _withdrawal_id uuid, _withdrawal_amount numeric)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _fee numeric; _balance numeric;
BEGIN
  IF _withdrawal_amount IS NULL OR _withdrawal_amount <= 0 THEN RAISE EXCEPTION 'invalid withdrawal amount'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_investments ui
    WHERE ui.user_id = _user_id AND ui.status = 'active' AND ui.ends_at > now()
      AND (ui.plan_id = 'field' OR ui.plan_name ILIKE '%field marshal%')
  ) THEN RETURN 0; END IF;
  _fee := CASE WHEN _withdrawal_amount < 100 THEN 5 WHEN _withdrawal_amount <= 1000 THEN 10 ELSE 100 END;
  INSERT INTO public.field_marshal_gas_balances(user_id, balance_usd) VALUES (_user_id, 0) ON CONFLICT (user_id) DO NOTHING;
  SELECT balance_usd INTO _balance FROM public.field_marshal_gas_balances WHERE user_id = _user_id FOR UPDATE;
  IF _balance < _fee THEN RAISE EXCEPTION 'insufficient TRON gas fee balance'; END IF;
  UPDATE public.field_marshal_gas_balances SET balance_usd = balance_usd - _fee, updated_at = now() WHERE user_id = _user_id;
  INSERT INTO public.field_marshal_gas_ledger(user_id, amount_usd, entry_type, status, withdrawal_id, note)
    VALUES (_user_id, -_fee, 'withdrawal_fee', 'confirmed', _withdrawal_id, 'TRON gas fee reserved at withdrawal request');
  RETURN _fee;
END;
$$;
REVOKE ALL ON FUNCTION public.field_marshal_reserve_gas_fee(uuid,uuid,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.field_marshal_reserve_gas_fee(uuid,uuid,numeric) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.field_marshal_refund_gas_fee(_withdrawal_id uuid)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _w public.withdrawals; _ledger public.field_marshal_gas_ledger; _fee numeric;
BEGIN
  SELECT * INTO _w FROM public.withdrawals WHERE id = _withdrawal_id FOR UPDATE;
  IF _w.id IS NULL THEN RAISE EXCEPTION 'withdrawal not found'; END IF;
  IF auth.uid() IS NULL OR (auth.uid() <> _w.user_id AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _w.status NOT IN ('rejected','cancelled') THEN RAISE EXCEPTION 'gas fee can only be refunded after withdrawal rejection or cancellation'; END IF;
  SELECT * INTO _ledger FROM public.field_marshal_gas_ledger
    WHERE withdrawal_id = _withdrawal_id AND entry_type = 'withdrawal_fee' FOR UPDATE;
  IF _ledger.id IS NULL THEN RETURN 0; END IF;
  IF EXISTS (SELECT 1 FROM public.field_marshal_gas_ledger WHERE withdrawal_id = _withdrawal_id AND entry_type = 'fee_refund') THEN RETURN 0; END IF;
  _fee := abs(_ledger.amount_usd);
  INSERT INTO public.field_marshal_gas_balances(user_id, balance_usd) VALUES (_w.user_id, _fee)
    ON CONFLICT (user_id) DO UPDATE SET balance_usd = field_marshal_gas_balances.balance_usd + EXCLUDED.balance_usd, updated_at = now();
  INSERT INTO public.field_marshal_gas_ledger(user_id, amount_usd, entry_type, status, withdrawal_id, note)
    VALUES (_w.user_id, _fee, 'fee_refund', 'confirmed', _withdrawal_id, 'TRON gas fee refunded after withdrawal rejection');
  RETURN _fee;
END;
$$;
REVOKE ALL ON FUNCTION public.field_marshal_refund_gas_fee(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.field_marshal_refund_gas_fee(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.request_field_marshal_wallet_withdrawal(_amount numeric, _address text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _addr text := btrim(COALESCE(_address, '')); _ent public.plan_entitlements;
  _fee numeric; _gas_fee numeric; _total numeric; _bal numeric; _cap numeric; _used numeric; _wid uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _amount IS NULL OR _amount < 10 THEN RAISE EXCEPTION 'minimum withdrawal amount is $10'; END IF;
  IF length(_addr) < 26 OR length(_addr) > 120 OR _addr ~ '^[0-9]+$' THEN RAISE EXCEPTION 'invalid wallet address'; END IF;
  IF NOT (_addr ~ '^(1|3|bc1)[a-zA-Z0-9]{25,34}$' OR _addr ~ '^0x[a-fA-F0-9]{40}$' OR _addr ~ '^T[a-zA-Z0-9]{33}$') THEN
    RAISE EXCEPTION 'invalid wallet address';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_investments ui WHERE ui.user_id = _uid AND ui.status = 'active' AND ui.ends_at > now()
      AND (ui.plan_id = 'field' OR ui.plan_name ILIKE '%field marshal%')) THEN
    RAISE EXCEPTION 'Field Marshal plan required';
  END IF;
  SELECT * INTO _ent FROM public.get_user_entitlements(_uid);
  _cap := COALESCE(_ent.daily_withdrawal_cap, 2000);
  SELECT COALESCE(sum(amount),0) INTO _used FROM public.withdrawals WHERE user_id = _uid AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AND status NOT IN ('rejected','cancelled');
  IF _used + _amount > _cap THEN RAISE EXCEPTION 'daily withdrawal cap exceeded'; END IF;
  _fee := greatest(round((_amount * COALESCE(_ent.withdrawal_fee_pct, 0.01))::numeric, 2), 1);
  _total := _amount + _fee;
  SELECT balance INTO _bal FROM public.wallet_balances WHERE user_id = _uid AND coin_symbol = 'USDT' FOR UPDATE;
  IF COALESCE(_bal,0) < _total THEN RAISE EXCEPTION 'insufficient withdrawal amount or USDT balance'; END IF;
  UPDATE public.wallet_balances SET balance = balance - _total, updated_at = now() WHERE user_id = _uid AND coin_symbol = 'USDT';
  INSERT INTO public.withdrawals(user_id, amount, wallet_address, fee, status, notes)
    VALUES (_uid, _amount, _addr, _fee, 'pending', 'Field Marshal USDT withdrawal — pending admin approval') RETURNING id INTO _wid;
  _gas_fee := public.field_marshal_reserve_gas_fee(_uid, _wid, _amount);
  UPDATE public.withdrawals SET notes = notes || '; TRON gas fee $' || _gas_fee::text || ' reserved' WHERE id = _wid;
  INSERT INTO public.transactions(user_id, type, amount, from_symbol, to_symbol, status, notes)
    VALUES (_uid, 'withdrawal', _amount, 'USDT', 'USDT', 'pending', 'Withdrawal request ' || _wid::text || ' — pending admin approval');
  RETURN jsonb_build_object('success',true,'withdrawal_id',_wid,'amount',_amount,'fee',_fee,'gas_fee',_gas_fee,'total',_total,'status','pending','message','Withdrawal request is pending admin approval.');
END;
$$;
REVOKE ALL ON FUNCTION public.request_field_marshal_wallet_withdrawal(numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_field_marshal_wallet_withdrawal(numeric,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.live_withdraw(_amount numeric, _address text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bal numeric; _fee numeric; _gas_fee numeric; _addr text; _wid uuid; _s jsonb; _min numeric;
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
  _fee := greatest(round((_amount * COALESCE((_s->>'withdrawal_fee_pct')::numeric, 1) / 100.0)::numeric, 2), COALESCE((_s->>'withdrawal_fee_min')::numeric, 1));
  UPDATE public.live_accounts SET balance = balance - _amount, updated_at = now() WHERE user_id = auth.uid();
  INSERT INTO public.withdrawals(user_id, amount, wallet_address, fee, status, notes)
    VALUES (auth.uid(), _amount, _addr, _fee, 'pending', 'Live trading terminal withdrawal — pending admin approval') RETURNING id INTO _wid;
  _gas_fee := public.field_marshal_reserve_gas_fee(auth.uid(), _wid, _amount);
  UPDATE public.withdrawals SET notes = notes || '; TRON gas fee $' || _gas_fee::text || ' reserved' WHERE id = _wid;
  INSERT INTO public.transactions(user_id, type, from_symbol, amount, status, notes)
    VALUES (auth.uid(), 'withdrawal', 'USD', _amount, 'pending', 'Live trading withdrawal ' || _wid::text || ' to ' || _addr || ' — pending admin approval');
  RETURN jsonb_build_object('ok', true, 'withdrawal_id', _wid, 'fee', _fee, 'gas_fee', _gas_fee, 'net', _amount - _fee, 'status', 'pending');
END;
$$;

CREATE OR REPLACE FUNCTION public.live_refund_withdrawal(_withdrawal_id uuid, _status text, _notes text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _w public.withdrawals;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _status NOT IN ('cancelled','rejected') THEN RAISE EXCEPTION 'invalid status'; END IF;
  SELECT * INTO _w FROM public.withdrawals WHERE id = _withdrawal_id FOR UPDATE;
  IF _w.id IS NULL THEN RAISE EXCEPTION 'withdrawal not found'; END IF;
  IF _w.user_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF _w.status <> 'pending' THEN RAISE EXCEPTION 'withdrawal is not pending'; END IF;
  IF COALESCE(_w.notes,'') NOT LIKE 'Live trading%' THEN RAISE EXCEPTION 'not a live trading withdrawal'; END IF;
  UPDATE public.live_accounts SET balance = balance + _w.amount, updated_at = now() WHERE user_id = _w.user_id;
  UPDATE public.withdrawals SET status = _status, notes = _notes, processed_at = now() WHERE id = _withdrawal_id;
  UPDATE public.transactions SET status = CASE WHEN _status = 'rejected' THEN 'failed' ELSE 'cancelled' END
    WHERE user_id = _w.user_id AND type = 'withdrawal' AND status = 'pending' AND notes LIKE 'Live trading withdrawal ' || _withdrawal_id::text || '%';
  PERFORM public.field_marshal_refund_gas_fee(_withdrawal_id);
  RETURN jsonb_build_object('ok', true, 'refunded', _w.amount, 'target', 'live_balance');
END;
$$;

DROP POLICY IF EXISTS "Authenticated users can view plan entitlements" ON public.plan_entitlements;
CREATE POLICY "Admins can view plan entitlements"
  ON public.plan_entitlements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
REVOKE SELECT ON public.plan_entitlements FROM anon;
