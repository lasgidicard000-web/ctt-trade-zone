CREATE OR REPLACE FUNCTION public.admin_apply_transaction_action(_admin_id uuid, _action text, _payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _target_table text;
  _target_id uuid;
  _before jsonb;
  _after jsonb;
  _row record;
  _new_status text;
  _reason text;
  _new_amount numeric;
  _new_hash text;
  _new_notes text;
  _target_user_id uuid;
  _coin text;
  _direction text;
  _amt numeric;
  _current numeric;
  _new_balance numeric;
  _btc_before numeric;
  _usdt_before numeric;
  _btc_after numeric;
  _usdt_after numeric;
BEGIN
  IF _admin_id IS NULL OR NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF _action = 'adjust-balance' THEN
    _target_user_id := (_payload->>'user_id')::uuid;
    _coin := upper(_payload->>'coin_symbol');
    _direction := _payload->>'direction';
    _amt := (_payload->>'amount')::numeric;
    _reason := _payload->>'reason';

    IF _target_user_id IS NULL OR _coin IS NULL OR _amt IS NULL OR _amt <= 0 THEN
      RAISE EXCEPTION 'invalid adjustment payload';
    END IF;
    IF _direction NOT IN ('credit','debit') THEN
      RAISE EXCEPTION 'direction must be credit or debit';
    END IF;

    -- Snapshot BTC and USDT balances BEFORE the change
    SELECT COALESCE(balance, 0) INTO _btc_before FROM public.wallet_balances
      WHERE user_id = _target_user_id AND coin_symbol = 'BTC';
    _btc_before := COALESCE(_btc_before, 0);
    SELECT COALESCE(balance, 0) INTO _usdt_before FROM public.wallet_balances
      WHERE user_id = _target_user_id AND coin_symbol = 'USDT';
    _usdt_before := COALESCE(_usdt_before, 0);

    SELECT balance INTO _current
    FROM public.wallet_balances
    WHERE user_id = _target_user_id AND coin_symbol = _coin
    FOR UPDATE;

    _current := COALESCE(_current, 0);
    IF _direction = 'credit' THEN
      _new_balance := _current + _amt;
    ELSE
      IF _current < _amt THEN
        RAISE EXCEPTION 'insufficient balance for debit';
      END IF;
      _new_balance := _current - _amt;
    END IF;

    INSERT INTO public.wallet_balances(user_id, coin_symbol, balance)
    VALUES (_target_user_id, _coin, _new_balance)
    ON CONFLICT (user_id, coin_symbol) DO UPDATE SET balance = EXCLUDED.balance, updated_at = now();

    -- Compute after-snapshot for BTC and USDT
    IF _coin = 'BTC' THEN
      _btc_after := _new_balance;
      _usdt_after := _usdt_before;
    ELSIF _coin = 'USDT' THEN
      _btc_after := _btc_before;
      _usdt_after := _new_balance;
    ELSE
      _btc_after := _btc_before;
      _usdt_after := _usdt_before;
    END IF;

    INSERT INTO public.transactions(user_id, type, from_symbol, to_symbol, amount, status)
    VALUES (
      _target_user_id,
      'admin_adjustment',
      CASE WHEN _direction = 'debit' THEN _coin ELSE NULL END,
      CASE WHEN _direction = 'credit' THEN _coin ELSE NULL END,
      _amt,
      'completed'
    )
    RETURNING id INTO _target_id;

    INSERT INTO public.admin_transaction_log(
      admin_user_id, action, target_table, target_id, target_user_id,
      before, after, reason
    ) VALUES (
      _admin_id, _action, 'transactions', _target_id, _target_user_id,
      jsonb_build_object(
        'balance', _current,
        'coin', _coin,
        'coin_balance', _current,
        'btc', _btc_before,
        'usdt', _usdt_before
      ),
      jsonb_build_object(
        'balance', _new_balance,
        'direction', _direction,
        'coin', _coin,
        'amount', _amt,
        'coin_balance', _new_balance,
        'btc', _btc_after,
        'usdt', _usdt_after
      ),
      _reason
    );

    RETURN jsonb_build_object('ok', true, 'newBalance', _new_balance, 'transactionId', _target_id);
  END IF;

  _target_table := _payload->>'target_table';
  _target_id := (_payload->>'target_id')::uuid;
  _reason := _payload->>'reason';

  IF _target_table NOT IN ('transactions','withdrawals','deposit_history','crypto_payments') THEN
    RAISE EXCEPTION 'invalid target_table';
  END IF;
  IF _target_id IS NULL THEN
    RAISE EXCEPTION 'target_id required';
  END IF;

  EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id = $1', _target_table)
    INTO _before USING _target_id;
  IF _before IS NULL THEN
    RAISE EXCEPTION 'row not found';
  END IF;
  _target_user_id := (_before->>'user_id')::uuid;

  IF _action = 'delete' THEN
    IF _target_table = 'withdrawals' AND (_before->>'status') = 'pending' THEN
      _amt := (_before->>'amount')::numeric + COALESCE((_before->>'fee')::numeric, 0);
      SELECT balance INTO _current FROM public.wallet_balances
        WHERE user_id = _target_user_id AND coin_symbol = 'USDT' FOR UPDATE;
      _current := COALESCE(_current, 0);
      INSERT INTO public.wallet_balances(user_id, coin_symbol, balance)
      VALUES (_target_user_id, 'USDT', _current + _amt)
      ON CONFLICT (user_id, coin_symbol) DO UPDATE SET balance = EXCLUDED.balance, updated_at = now();
    END IF;

    EXECUTE format('DELETE FROM public.%I WHERE id = $1', _target_table) USING _target_id;
    _after := NULL;

  ELSIF _action = 'edit' THEN
    _new_amount := NULLIF(_payload->>'amount','')::numeric;
    _new_hash := _payload->>'transaction_hash';
    _new_notes := _payload->>'notes';

    IF _target_table = 'transactions' THEN
      UPDATE public.transactions SET
        amount = COALESCE(_new_amount, amount),
        notes = COALESCE(_new_notes, notes)
      WHERE id = _target_id;
    ELSIF _target_table = 'withdrawals' THEN
      UPDATE public.withdrawals SET
        amount = COALESCE(_new_amount, amount),
        transaction_hash = COALESCE(_new_hash, transaction_hash),
        notes = COALESCE(_new_notes, notes)
      WHERE id = _target_id;
    ELSIF _target_table = 'deposit_history' THEN
      UPDATE public.deposit_history SET
        amount = COALESCE(_new_amount, amount),
        transaction_hash = COALESCE(_new_hash, transaction_hash),
        notes = COALESCE(_new_notes, notes)
      WHERE id = _target_id;
    ELSIF _target_table = 'crypto_payments' THEN
      UPDATE public.crypto_payments SET
        pay_amount = COALESCE(_new_amount, pay_amount)
      WHERE id = _target_id;
    END IF;

    EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id = $1', _target_table)
      INTO _after USING _target_id;

  ELSIF _action = 'set-status' THEN
    _new_status := _payload->>'status';
    IF _new_status IS NULL THEN
      RAISE EXCEPTION 'status required';
    END IF;

    IF _target_table = 'withdrawals'
       AND (_before->>'status') = 'pending'
       AND _new_status IN ('rejected','cancelled') THEN
      _amt := (_before->>'amount')::numeric + COALESCE((_before->>'fee')::numeric, 0);
      SELECT balance INTO _current FROM public.wallet_balances
        WHERE user_id = _target_user_id AND coin_symbol = 'USDT' FOR UPDATE;
      _current := COALESCE(_current, 0);
      INSERT INTO public.wallet_balances(user_id, coin_symbol, balance)
      VALUES (_target_user_id, 'USDT', _current + _amt)
      ON CONFLICT (user_id, coin_symbol) DO UPDATE SET balance = EXCLUDED.balance, updated_at = now();
    END IF;

    IF _target_table = 'transactions' THEN
      UPDATE public.transactions SET status = _new_status WHERE id = _target_id;
    ELSIF _target_table = 'withdrawals' THEN
      UPDATE public.withdrawals SET
        status = _new_status,
        notes = COALESCE(_reason, notes),
        processed_at = CASE WHEN _new_status <> 'pending' THEN now() ELSE processed_at END
      WHERE id = _target_id;
    ELSIF _target_table = 'deposit_history' THEN
      UPDATE public.deposit_history SET
        confirmation_status = _new_status,
        notes = COALESCE(_reason, notes),
        confirmed_at = CASE WHEN _new_status = 'confirmed' THEN now() ELSE confirmed_at END
      WHERE id = _target_id;
    ELSIF _target_table = 'crypto_payments' THEN
      UPDATE public.crypto_payments SET payment_status = _new_status WHERE id = _target_id;
    END IF;

    EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id = $1', _target_table)
      INTO _after USING _target_id;

  ELSIF _action = 'reverse' THEN
    IF _target_table = 'transactions' THEN
      _amt := (_before->>'amount')::numeric;
      _coin := COALESCE(_before->>'to_symbol', _before->>'from_symbol', 'USDT');
      SELECT balance INTO _current FROM public.wallet_balances
        WHERE user_id = _target_user_id AND coin_symbol = _coin FOR UPDATE;
      _current := COALESCE(_current, 0);
      IF (_before->>'to_symbol') IS NOT NULL THEN
        _new_balance := GREATEST(0, _current - _amt);
      ELSE
        _new_balance := _current + _amt;
      END IF;
      INSERT INTO public.wallet_balances(user_id, coin_symbol, balance)
      VALUES (_target_user_id, _coin, _new_balance)
      ON CONFLICT (user_id, coin_symbol) DO UPDATE SET balance = EXCLUDED.balance, updated_at = now();
      UPDATE public.transactions SET status = 'reversed' WHERE id = _target_id;
    ELSIF _target_table = 'withdrawals' AND (_before->>'status') = 'completed' THEN
      _amt := (_before->>'amount')::numeric + COALESCE((_before->>'fee')::numeric, 0);
      SELECT balance INTO _current FROM public.wallet_balances
        WHERE user_id = _target_user_id AND coin_symbol = 'USDT' FOR UPDATE;
      _current := COALESCE(_current, 0);
      INSERT INTO public.wallet_balances(user_id, coin_symbol, balance)
      VALUES (_target_user_id, 'USDT', _current + _amt)
      ON CONFLICT (user_id, coin_symbol) DO UPDATE SET balance = EXCLUDED.balance, updated_at = now();
      UPDATE public.withdrawals SET status = 'reversed', notes = COALESCE(_reason, notes), processed_at = now()
        WHERE id = _target_id;
    ELSIF _target_table = 'deposit_history' AND (_before->>'confirmation_status') = 'confirmed' THEN
      _amt := (_before->>'amount')::numeric;
      _coin := upper(_before->>'coin_symbol');
      SELECT balance INTO _current FROM public.wallet_balances
        WHERE user_id = _target_user_id AND coin_symbol = _coin FOR UPDATE;
      _current := COALESCE(_current, 0);
      _new_balance := GREATEST(0, _current - _amt);
      INSERT INTO public.wallet_balances(user_id, coin_symbol, balance)
      VALUES (_target_user_id, _coin, _new_balance)
      ON CONFLICT (user_id, coin_symbol) DO UPDATE SET balance = EXCLUDED.balance, updated_at = now();
      UPDATE public.deposit_history SET confirmation_status = 'reversed', notes = COALESCE(_reason, notes)
        WHERE id = _target_id;
    ELSE
      RAISE EXCEPTION 'reverse not applicable for this row';
    END IF;

    EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id = $1', _target_table)
      INTO _after USING _target_id;

  ELSE
    RAISE EXCEPTION 'invalid action: %', _action;
  END IF;

  INSERT INTO public.admin_transaction_log(
    admin_user_id, action, target_table, target_id, target_user_id,
    before, after, reason
  ) VALUES (
    _admin_id, _action, _target_table, _target_id, _target_user_id,
    _before, _after, _reason
  );

  RETURN jsonb_build_object('ok', true, 'action', _action, 'targetId', _target_id);
END;
$function$;