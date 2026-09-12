CREATE TABLE public.card_bank_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  card_id uuid NOT NULL REFERENCES public.virtual_cards(id) ON DELETE CASCADE,
  holder_name text NOT NULL,
  bank_name text NOT NULL,
  account_masked text NOT NULL,
  account_last4 text NOT NULL,
  branch_code text,
  country text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (card_id)
);

GRANT SELECT, INSERT, UPDATE ON public.card_bank_accounts TO authenticated;
GRANT ALL ON public.card_bank_accounts TO service_role;

ALTER TABLE public.card_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_accounts_owner_select" ON public.card_bank_accounts
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "bank_accounts_owner_insert" ON public.card_bank_accounts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "bank_accounts_owner_update" ON public.card_bank_accounts
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_card_bank_accounts_updated_at
  BEFORE UPDATE ON public.card_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.card_bank_withdrawals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  card_id uuid NOT NULL REFERENCES public.virtual_cards(id) ON DELETE CASCADE,
  bank_account_id uuid REFERENCES public.card_bank_accounts(id) ON DELETE SET NULL,
  amount_usd numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  decided_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.card_bank_withdrawals TO authenticated;
GRANT ALL ON public.card_bank_withdrawals TO service_role;

ALTER TABLE public.card_bank_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_withdrawals_owner_select" ON public.card_bank_withdrawals
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_card_bank_withdrawals_updated_at
  BEFORE UPDATE ON public.card_bank_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.card_request_bank_withdrawal(_card_id uuid, _amount_usd numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_card public.virtual_cards;
  v_bank public.card_bank_accounts;
  v_held numeric;
  v_available numeric;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  SELECT * INTO v_card FROM public.virtual_cards
    WHERE id = _card_id AND user_id = v_uid FOR UPDATE;
  IF v_card.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'card_not_found');
  END IF;
  IF v_card.status <> 'active' OR v_card.activated_at IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'card_not_active');
  END IF;

  SELECT * INTO v_bank FROM public.card_bank_accounts WHERE card_id = _card_id AND user_id = v_uid;
  IF v_bank.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_bank_account');
  END IF;

  IF _amount_usd IS NULL OR _amount_usd < 20000 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'below_minimum', 'minimum', 20000);
  END IF;

  SELECT COALESCE(SUM(amount_usd), 0) INTO v_held
    FROM public.card_bank_withdrawals WHERE card_id = _card_id AND status = 'pending';
  SELECT v_held + COALESCE(SUM(amount_usd), 0) INTO v_held
    FROM public.merchant_payment_requests WHERE card_id = _card_id AND status = 'pending';

  v_available := COALESCE(v_card.balance_usd, 0) - COALESCE(v_held, 0);
  IF _amount_usd > v_available THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_balance', 'availableUsd', v_available);
  END IF;

  INSERT INTO public.card_bank_withdrawals (user_id, card_id, bank_account_id, amount_usd, status)
  VALUES (v_uid, _card_id, v_bank.id, _amount_usd, 'pending')
  RETURNING id INTO v_id;

  INSERT INTO public.transactions (user_id, type, from_symbol, to_symbol, amount, status, notes)
  VALUES (v_uid, 'card_bank_withdrawal', 'USDT', 'BANK', _amount_usd, 'pending',
          'Simulated bank transfer to ' || v_bank.bank_name || ' ' || v_bank.account_masked);

  INSERT INTO public.card_security_events (user_id, card_id, action, success, detail)
  VALUES (v_uid, _card_id, 'bank_withdrawal_request', true, 'Amount ' || _amount_usd::text);

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'availableUsd', v_available - _amount_usd);
END;
$$;

REVOKE ALL ON FUNCTION public.card_request_bank_withdrawal(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.card_request_bank_withdrawal(uuid, numeric) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_decide_bank_withdrawal(_withdrawal_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req public.card_bank_withdrawals;
  v_card public.virtual_cards;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_admin');
  END IF;

  SELECT * INTO v_req FROM public.card_bank_withdrawals WHERE id = _withdrawal_id FOR UPDATE;
  IF v_req.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  IF v_req.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_decided');
  END IF;

  IF _approve THEN
    SELECT * INTO v_card FROM public.virtual_cards WHERE id = v_req.card_id FOR UPDATE;
    IF COALESCE(v_card.balance_usd, 0) < v_req.amount_usd THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_balance');
    END IF;

    UPDATE public.virtual_cards
      SET balance_usd = balance_usd - v_req.amount_usd, updated_at = now()
      WHERE id = v_req.card_id;

    UPDATE public.card_bank_withdrawals
      SET status = 'paid', admin_note = _note, decided_at = now(), updated_at = now()
      WHERE id = _withdrawal_id;

    INSERT INTO public.card_transactions (card_id, user_id, merchant, amount_usd, amount_btc, btc_rate, status)
    VALUES (v_req.card_id, v_req.user_id, 'Bank transfer (simulated)', v_req.amount_usd, 0, 0, 'approved');

    UPDATE public.transactions
      SET status = 'completed'
      WHERE user_id = v_req.user_id AND type = 'card_bank_withdrawal'
        AND status = 'pending' AND amount = v_req.amount_usd;
  ELSE
    UPDATE public.card_bank_withdrawals
      SET status = 'declined', admin_note = _note, decided_at = now(), updated_at = now()
      WHERE id = _withdrawal_id;

    UPDATE public.transactions
      SET status = 'failed'
      WHERE user_id = v_req.user_id AND type = 'card_bank_withdrawal'
        AND status = 'pending' AND amount = v_req.amount_usd;
  END IF;

  INSERT INTO public.admin_transaction_log (admin_user_id, action, target_table, target_id, target_user_id, reason)
  VALUES (v_uid, CASE WHEN _approve THEN 'approve_bank_withdrawal' ELSE 'decline_bank_withdrawal' END,
          'card_bank_withdrawals', _withdrawal_id, v_req.user_id, _note);

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_decide_bank_withdrawal(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_decide_bank_withdrawal(uuid, boolean, text) TO authenticated, service_role;