CREATE OR REPLACE FUNCTION public.pay_general_plan_fee(_agree boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); s jsonb := general_fee_settings(); cs date := general_fee_cycle_start();
  amt numeric; usdt_price numeric; qty numeric; bal numeric; tx uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT COALESCE(_agree,false) THEN RAISE EXCEPTION 'You must agree to the fee notice first'; END IF;
  IF NOT (s->>'enabled')::boolean THEN RAISE EXCEPTION 'The General plan fee is currently switched off'; END IF;
  IF NOT is_general_member(uid) THEN RAISE EXCEPTION 'Only active General plan members pay this fee'; END IF;
  IF now()::date < cs THEN RAISE EXCEPTION 'The fee is not due yet'; END IF;
  IF EXISTS (SELECT 1 FROM plan_fee_charges WHERE user_id=uid AND cycle_start=cs) THEN RAISE EXCEPTION 'Already paid for this cycle'; END IF;
  amt := (s->>'amount_usd')::numeric;
  SELECT coin_prices.price INTO usdt_price FROM coin_prices WHERE symbol='USDT';
  qty := round(amt / COALESCE(NULLIF(usdt_price,0),1), 8);
  SELECT balance INTO bal FROM wallet_balances WHERE user_id=uid AND coin_symbol='USDT' FOR UPDATE;
  IF COALESCE(bal,0) < qty THEN RAISE EXCEPTION 'Not enough USDT balance to pay the fee'; END IF;
  UPDATE wallet_balances SET balance=balance-qty, updated_at=now() WHERE user_id=uid AND coin_symbol='USDT';
  INSERT INTO transactions(user_id,type,from_symbol,amount,status,notes)
    VALUES (uid,'fee','USDT',qty,'completed','General plan maintenance fee — $'||to_char(amt,'FM999,990.00')) RETURNING id INTO tx;
  INSERT INTO plan_fee_charges(user_id,cycle_start,amount_usd,transaction_id) VALUES (uid,cs,amt,tx);
  RETURN jsonb_build_object('ok',true,'amount_usd',amt,'usdt_debited',qty,'transaction_id',tx,'cycle_start',cs,'paid_at',now());
END $$;