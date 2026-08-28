CREATE OR REPLACE FUNCTION public.live_refund_withdrawal(_withdrawal_id uuid, _status text, _notes text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _w public.withdrawals;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _status NOT IN ('cancelled','rejected') THEN RAISE EXCEPTION 'invalid status'; END IF;

  SELECT * INTO _w FROM public.withdrawals WHERE id = _withdrawal_id FOR UPDATE;
  IF _w.id IS NULL THEN RAISE EXCEPTION 'withdrawal not found'; END IF;
  IF _w.user_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _w.status <> 'pending' THEN RAISE EXCEPTION 'withdrawal is not pending'; END IF;
  IF COALESCE(_w.notes,'') NOT LIKE 'Live trading%' THEN RAISE EXCEPTION 'not a live trading withdrawal'; END IF;

  UPDATE public.live_accounts
    SET balance = balance + _w.amount, updated_at = now()
    WHERE user_id = _w.user_id;

  UPDATE public.withdrawals
    SET status = _status, notes = _notes, processed_at = now()
    WHERE id = _withdrawal_id;

  UPDATE public.transactions
    SET status = CASE WHEN _status = 'rejected' THEN 'failed' ELSE 'cancelled' END
    WHERE user_id = _w.user_id AND type = 'withdrawal' AND status = 'pending'
      AND notes = 'Live trading withdrawal to ' || _w.wallet_address;

  RETURN jsonb_build_object('ok', true, 'refunded', _w.amount, 'target', 'live_balance');
END;
$$;

REVOKE ALL ON FUNCTION public.live_refund_withdrawal(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.live_refund_withdrawal(uuid, text, text) TO authenticated, service_role;