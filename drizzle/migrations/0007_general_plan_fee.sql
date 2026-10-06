CREATE TABLE public.plan_fee_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cycle_start date NOT NULL,
  amount_usd numeric NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  transaction_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, cycle_start)
);
GRANT SELECT ON public.plan_fee_charges TO authenticated;
GRANT ALL ON public.plan_fee_charges TO service_role;
ALTER TABLE public.plan_fee_charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin read fee charges" ON public.plan_fee_charges FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.plan_fee_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  status text NOT NULL DEFAULT 'open',
  admin_reply text,
  replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.plan_fee_inquiries TO authenticated;
GRANT ALL ON public.plan_fee_inquiries TO service_role;
ALTER TABLE public.plan_fee_inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin read inquiries" ON public.plan_fee_inquiries FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "members create own inquiries" ON public.plan_fee_inquiries FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'open' AND admin_reply IS NULL);
CREATE POLICY "admins update inquiries" ON public.plan_fee_inquiries FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.general_fee_settings() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('amount_usd',630,'cycle_months',24,'due_month',10,'due_week',1,'enabled',true,'effective_from','2026-10-06')
    || COALESCE((SELECT value FROM app_settings WHERE key='general_plan_fee'),'{}'::jsonb)
$$;

CREATE OR REPLACE FUNCTION public.general_fee_cycle_start() RETURNS date
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT make_date(2026 + 2*floor((extract(year from now())::int - 2026)/2.0)::int, 10, 1)
$$;

CREATE OR REPLACE FUNCTION public.is_general_member(_uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM user_investments WHERE user_id=_uid AND status='active' AND plan_id IN ('general','general-plan'))
$$;

CREATE OR REPLACE FUNCTION public.get_general_fee_status() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE s jsonb := general_fee_settings(); cs date := general_fee_cycle_start(); paid record; bal numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO paid FROM plan_fee_charges WHERE user_id=auth.uid() AND cycle_start=cs;
  SELECT COALESCE(balance,0) INTO bal FROM wallet_balances WHERE user_id=auth.uid() AND coin_symbol='USDT';
  RETURN jsonb_build_object(
    'settings', s, 'cycle_start', cs, 'next_cycle_start', (cs + interval '2 years')::date,
    'is_general_member', is_general_member(auth.uid()),
    'paid_this_cycle', paid.id IS NOT NULL, 'paid_at', paid.paid_at,
    'due', (s->>'enabled')::boolean AND is_general_member(auth.uid()) AND paid.id IS NULL AND now()::date >= cs,
    'usdt_balance', COALESCE(bal,0),
    'times_paid', (SELECT count(*) FROM plan_fee_charges WHERE user_id=auth.uid()));
END $$;

CREATE OR REPLACE FUNCTION public.pay_general_plan_fee(_agree boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); s jsonb := general_fee_settings(); cs date := general_fee_cycle_start();
  amt numeric; price numeric; qty numeric; bal numeric; tx uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT COALESCE(_agree,false) THEN RAISE EXCEPTION 'You must agree to the fee notice first'; END IF;
  IF NOT (s->>'enabled')::boolean THEN RAISE EXCEPTION 'The General plan fee is currently switched off'; END IF;
  IF NOT is_general_member(uid) THEN RAISE EXCEPTION 'Only active General plan members pay this fee'; END IF;
  IF now()::date < cs THEN RAISE EXCEPTION 'The fee is not due yet'; END IF;
  IF EXISTS (SELECT 1 FROM plan_fee_charges WHERE user_id=uid AND cycle_start=cs) THEN RAISE EXCEPTION 'Already paid for this cycle'; END IF;
  amt := (s->>'amount_usd')::numeric;
  SELECT price INTO price FROM coin_prices WHERE symbol='USDT';
  qty := round(amt / COALESCE(NULLIF(price,0),1), 8);
  SELECT balance INTO bal FROM wallet_balances WHERE user_id=uid AND coin_symbol='USDT' FOR UPDATE;
  IF COALESCE(bal,0) < qty THEN RAISE EXCEPTION 'Not enough USDT balance to pay the fee'; END IF;
  UPDATE wallet_balances SET balance=balance-qty, updated_at=now() WHERE user_id=uid AND coin_symbol='USDT';
  INSERT INTO transactions(user_id,type,from_symbol,amount,status,notes)
    VALUES (uid,'fee','USDT',qty,'completed','General plan maintenance fee — $'||to_char(amt,'FM999,990.00')) RETURNING id INTO tx;
  INSERT INTO plan_fee_charges(user_id,cycle_start,amount_usd,transaction_id) VALUES (uid,cs,amt,tx);
  RETURN jsonb_build_object('ok',true,'amount_usd',amt,'usdt_debited',qty,'transaction_id',tx,'cycle_start',cs,'paid_at',now());
END $$;

CREATE OR REPLACE FUNCTION public.get_general_fee_stats() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'members_covered', (SELECT count(DISTINCT user_id) FROM user_investments WHERE status='active' AND plan_id IN ('general','general-plan')),
    'paid_this_cycle', (SELECT count(*) FROM plan_fee_charges WHERE cycle_start=general_fee_cycle_start()),
    'pending_this_cycle', GREATEST(0,(SELECT count(DISTINCT user_id) FROM user_investments ui WHERE status='active' AND plan_id IN ('general','general-plan')
        AND NOT EXISTS (SELECT 1 FROM plan_fee_charges c WHERE c.user_id=ui.user_id AND c.cycle_start=general_fee_cycle_start()))),
    'by_month', COALESCE((SELECT jsonb_agg(jsonb_build_object('month',m,'count',n,'total_usd',t) ORDER BY m)
       FROM (SELECT to_char(paid_at,'YYYY-MM') m, count(*) n, sum(amount_usd) t FROM plan_fee_charges GROUP BY 1) x),'[]'::jsonb))
$$;

CREATE OR REPLACE FUNCTION public.admin_list_general_fee_members()
RETURNS TABLE(user_id uuid, display_name text, email text, wallet_address text, times_paid integer, last_paid_at timestamptz, paid_dates timestamptz[], status text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin role required'; END IF;
  RETURN QUERY
  SELECT m.uid, p.display_name, u.email::text,
    (SELECT w.wallet_address FROM crypto_wallet_addresses w WHERE w.user_id=m.uid ORDER BY (w.coin_symbol='BTC') DESC, w.created_at LIMIT 1),
    (SELECT count(*)::int FROM plan_fee_charges c WHERE c.user_id=m.uid),
    (SELECT max(c.paid_at) FROM plan_fee_charges c WHERE c.user_id=m.uid),
    (SELECT array_agg(c.paid_at ORDER BY c.paid_at) FROM plan_fee_charges c WHERE c.user_id=m.uid),
    CASE WHEN EXISTS (SELECT 1 FROM plan_fee_charges c WHERE c.user_id=m.uid AND c.cycle_start=general_fee_cycle_start()) THEN 'paid'
         WHEN now()::date >= general_fee_cycle_start() THEN 'due' ELSE 'not_yet_due' END
  FROM (SELECT DISTINCT ui.user_id uid FROM user_investments ui WHERE ui.status='active' AND ui.plan_id IN ('general','general-plan')) m
  LEFT JOIN profiles p ON p.user_id=m.uid
  LEFT JOIN auth.users u ON u.id=m.uid;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_general_fee_settings(_settings jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE merged jsonb;
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin role required'; END IF;
  IF (_settings ? 'amount_usd') AND (_settings->>'amount_usd')::numeric < 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  merged := general_fee_settings() || (_settings - 'effective_from' - 'cycle_months');
  INSERT INTO app_settings(key,value) VALUES ('general_plan_fee',merged)
    ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now();
  INSERT INTO admin_transaction_log(admin_user_id,action,target_table,after,reason)
    VALUES (auth.uid(),'update-settings','app_settings',merged,'General plan fee settings');
  RETURN merged;
END $$;

REVOKE EXECUTE ON FUNCTION public.general_fee_settings(), public.general_fee_cycle_start(), public.is_general_member(uuid), public.get_general_fee_status(), public.pay_general_plan_fee(boolean), public.get_general_fee_stats(), public.admin_list_general_fee_members(), public.admin_set_general_fee_settings(jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.general_fee_settings(), public.general_fee_cycle_start(), public.get_general_fee_status(), public.pay_general_plan_fee(boolean), public.get_general_fee_stats(), public.admin_list_general_fee_members(), public.admin_set_general_fee_settings(jsonb) TO authenticated;