CREATE OR REPLACE FUNCTION public.admin_live_pnl_summary()
RETURNS TABLE(
  user_id uuid,
  display_name text,
  funded_total numeric,
  realized_pnl numeric,
  unrealized_pnl numeric,
  fees_total numeric,
  gross_profit numeric,
  gross_loss numeric,
  withdrawn_total numeric,
  pending_withdrawal_total numeric,
  trades_count integer,
  last_trade_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  WITH accts AS (
    SELECT la.user_id, la.realized_pnl FROM public.live_accounts la
  ),
  fund AS (
    SELECT lf.user_id, COALESCE(SUM(lf.amount_usd), 0) AS total
    FROM public.live_funding lf
    WHERE lf.status IN ('completed', 'credited', 'approved')
    GROUP BY lf.user_id
  ),
  trd AS (
    SELECT lt.user_id,
           COALESCE(SUM(lt.fee), 0) AS fees,
           COALESCE(SUM(GREATEST(lt.pnl, 0)), 0) AS profit,
           COALESCE(SUM(LEAST(lt.pnl, 0)), 0) AS loss,
           COUNT(*)::int AS cnt,
           MAX(lt.created_at) AS last_at
    FROM public.live_trades lt
    GROUP BY lt.user_id
  ),
  hold AS (
    SELECT lh.user_id,
           COALESCE(SUM((public.live_price(lh.coin_symbol) - lh.avg_price) * lh.qty), 0) AS unreal
    FROM public.live_holdings lh
    WHERE lh.qty > 0
    GROUP BY lh.user_id
  ),
  wd AS (
    SELECT w.user_id,
           COALESCE(SUM(CASE WHEN w.status IN ('completed', 'approved') THEN w.amount ELSE 0 END), 0) AS paid,
           COALESCE(SUM(CASE WHEN w.status = 'pending' THEN w.amount ELSE 0 END), 0) AS pending
    FROM public.withdrawals w
    WHERE w.notes LIKE 'Live trading%'
    GROUP BY w.user_id
  )
  SELECT a.user_id,
         p.display_name,
         COALESCE(f.total, 0),
         COALESCE(a.realized_pnl, 0),
         COALESCE(h.unreal, 0),
         COALESCE(t.fees, 0),
         COALESCE(t.profit, 0),
         COALESCE(t.loss, 0),
         COALESCE(x.paid, 0),
         COALESCE(x.pending, 0),
         COALESCE(t.cnt, 0),
         t.last_at
  FROM accts a
  LEFT JOIN public.profiles p ON p.user_id = a.user_id
  LEFT JOIN fund f ON f.user_id = a.user_id
  LEFT JOIN trd t ON t.user_id = a.user_id
  LEFT JOIN hold h ON h.user_id = a.user_id
  LEFT JOIN wd x ON x.user_id = a.user_id
  ORDER BY COALESCE(f.total, 0) DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_live_pnl_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_live_pnl_summary() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_live_pnl_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_live_pnl_summary() TO service_role;