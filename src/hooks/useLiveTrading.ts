import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface LiveAccount {
  id: string;
  user_id: string;
  balance: number;
  realized_pnl: number;
}

export interface LiveHolding {
  id: string;
  coin_symbol: string;
  qty: number;
  avg_price: number;
}

export interface LiveOrder {
  id: string;
  symbol: string;
  side: string;
  order_type: string;
  price: number | null;
  qty: number;
  amount_usd: number;
  status: string;
  filled_price: number | null;
  created_at: string;
}

export interface LiveTrade {
  id: string;
  symbol: string;
  side: string;
  price: number;
  qty: number;
  amount_usd: number;
  fee: number;
  pnl: number;
  created_at: string;
}

export interface LiveFunding {
  id: string;
  amount_usd: number;
  amount_btc: number;
  btc_rate: number;
  status: string;
  created_at: string;
}

export interface LiveWithdrawal {
  id: string;
  amount: number;
  wallet_address: string;
  fee: number;
  status: string;
  created_at: string;
}

const num = (v: unknown) => (typeof v === "number" ? v : parseFloat(String(v ?? 0)) || 0);

export interface LiveSettings {
  enabled: boolean;
  fee_pct: number;
  min_order_usd: number;
  min_funding_usd: number;
  min_withdrawal_usd: number;
  withdrawal_fee_pct: number;
  withdrawal_fee_min: number;
}

export const LIVE_SETTINGS_DEFAULTS: LiveSettings = {
  enabled: true,
  fee_pct: 0.1,
  min_order_usd: 10,
  min_funding_usd: 10,
  min_withdrawal_usd: 10,
  withdrawal_fee_pct: 1,
  withdrawal_fee_min: 1,
};

export const useLiveTrading = () => {
  const [settings, setSettings] = useState<LiveSettings>(LIVE_SETTINGS_DEFAULTS);
  const [account, setAccount] = useState<LiveAccount | null>(null);
  const [holdings, setHoldings] = useState<LiveHolding[]>([]);
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [trades, setTrades] = useState<LiveTrade[]>([]);
  const [funding, setFunding] = useState<LiveFunding[]>([]);
  const [withdrawals, setWithdrawals] = useState<LiveWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [{ data: acc }, hold, ords, trds, fund, wds, { data: cfg }] = await Promise.all([
      db.rpc("live_get_account"),
      db.from("live_holdings").select("*").order("coin_symbol"),
      db.from("live_orders").select("*").order("created_at", { ascending: false }).limit(60),
      db.from("live_trades").select("*").order("created_at", { ascending: false }).limit(80),
      db.from("live_funding").select("*").order("created_at", { ascending: false }).limit(40),
      db
        .from("withdrawals")
        .select("id, amount, wallet_address, fee, status, created_at")
        .like("notes", "Live trading%")
        .order("created_at", { ascending: false })
        .limit(40),
      db.rpc("live_settings"),
    ]);

    if (cfg) {
      setSettings({
        ...LIVE_SETTINGS_DEFAULTS,
        ...cfg,
        fee_pct: num(cfg.fee_pct ?? LIVE_SETTINGS_DEFAULTS.fee_pct),
        min_order_usd: num(cfg.min_order_usd ?? LIVE_SETTINGS_DEFAULTS.min_order_usd),
        min_funding_usd: num(cfg.min_funding_usd ?? LIVE_SETTINGS_DEFAULTS.min_funding_usd),
        min_withdrawal_usd: num(cfg.min_withdrawal_usd ?? LIVE_SETTINGS_DEFAULTS.min_withdrawal_usd),
        withdrawal_fee_pct: num(cfg.withdrawal_fee_pct ?? LIVE_SETTINGS_DEFAULTS.withdrawal_fee_pct),
        withdrawal_fee_min: num(cfg.withdrawal_fee_min ?? LIVE_SETTINGS_DEFAULTS.withdrawal_fee_min),
        enabled: cfg.enabled !== false,
      });
    }

    if (acc) {
      setAccount({
        ...acc,
        balance: num(acc.balance),
        realized_pnl: num(acc.realized_pnl),
        frozen: acc.frozen === true,
        frozen_reason: acc.frozen_reason ?? null,
      });
    }
    setHoldings(
      (hold.data ?? [])
        .map((h: any) => ({ ...h, qty: num(h.qty), avg_price: num(h.avg_price) }))
        .filter((h: LiveHolding) => h.qty > 0.00000001),
    );
    setOrders(
      (ords.data ?? []).map((o: any) => ({
        ...o,
        price: o.price === null ? null : num(o.price),
        qty: num(o.qty),
        amount_usd: num(o.amount_usd),
        filled_price: o.filled_price === null ? null : num(o.filled_price),
      })),
    );
    setTrades(
      (trds.data ?? []).map((t: any) => ({
        ...t,
        price: num(t.price),
        qty: num(t.qty),
        amount_usd: num(t.amount_usd),
        fee: num(t.fee),
        pnl: num(t.pnl),
      })),
    );
    setFunding(
      (fund.data ?? []).map((f: any) => ({
        ...f,
        amount_usd: num(f.amount_usd),
        amount_btc: num(f.amount_btc),
        btc_rate: num(f.btc_rate),
      })),
    );
    setWithdrawals(
      (wds.data ?? []).map((w: any) => ({ ...w, amount: num(w.amount), fee: num(w.fee) })),
    );
    setLoading(false);
  }, []);

  const tick = useCallback(async () => {
    const { data } = await db.rpc("live_engine_tick");
    if (data && data.fills > 0) await refresh();
    return data;
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(() => tick(), 15000);
    return () => clearInterval(id);
  }, [tick]);

  const fundFromCard = useCallback(
    async (cardId: string, amountUsd: number) => {
      const { data, error } = await db.rpc("live_fund_from_card", {
        _card_id: cardId,
        _amount_usd: amountUsd,
      });
      if (error) return { error: error.message };
      await refresh();
      return { result: data as any };
    },
    [refresh],
  );

  const placeOrder = useCallback(
    async (args: {
      symbol: string;
      side: "buy" | "sell";
      orderType: "market" | "limit";
      amountUsd: number;
      limitPrice?: number | null;
    }) => {
      const { data, error } = await db.rpc("live_place_order", {
        _symbol: args.symbol,
        _side: args.side,
        _order_type: args.orderType,
        _amount_usd: args.amountUsd,
        _limit_price: args.orderType === "limit" ? args.limitPrice ?? null : null,
      });
      if (error) return { error: error.message };
      await refresh();
      return { result: data as any };
    },
    [refresh],
  );

  const cancelOrder = useCallback(
    async (id: string) => {
      const { error } = await db.rpc("live_cancel_order", { _order_id: id });
      if (error) return { error: error.message };
      await refresh();
      return {};
    },
    [refresh],
  );

  const withdraw = useCallback(
    async (amount: number, address: string) => {
      const { data, error } = await db.rpc("live_withdraw", { _amount: amount, _address: address });
      if (error) return { error: error.message };
      await refresh();
      return { result: data as any };
    },
    [refresh],
  );

  const openOrders = orders.filter((o) => o.status === "open");

  return {
    account,
    holdings,
    orders,
    openOrders,
    trades,
    funding,
    withdrawals,
    loading,
    refresh,
    tick,
    fundFromCard,
    placeOrder,
    cancelOrder,
    withdraw,
  };
};
