import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface DemoAccount {
  id: string;
  user_id: string;
  balance: number;
  realized_pnl: number;
}

export interface DemoOrder {
  id: string;
  symbol: string;
  market: string;
  side: string;
  order_type: string;
  price: number | null;
  qty: number;
  amount_usd: number;
  leverage: number;
  status: string;
  filled_price: number | null;
  created_at: string;
}

export interface DemoPosition {
  id: string;
  symbol: string;
  market: string;
  side: string;
  entry_price: number;
  qty: number;
  leverage: number;
  margin: number;
  liq_price: number | null;
  status: string;
  pnl: number;
  close_price: number | null;
  close_reason: string | null;
  opened_at: string;
  closed_at: string | null;
}

export interface DemoTrade {
  id: string;
  symbol: string;
  market: string;
  side: string;
  price: number;
  qty: number;
  amount_usd: number;
  fee: number;
  pnl: number;
  kind: string;
  created_at: string;
}

const num = (v: unknown) => (typeof v === "number" ? v : parseFloat(String(v ?? 0)) || 0);

export const useDemoTrading = () => {
  const [account, setAccount] = useState<DemoAccount | null>(null);
  const [orders, setOrders] = useState<DemoOrder[]>([]);
  const [positions, setPositions] = useState<DemoPosition[]>([]);
  const [trades, setTrades] = useState<DemoTrade[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [{ data: acc }, ords, pos, trd] = await Promise.all([
      db.rpc("demo_get_account"),
      db.from("demo_orders").select("*").order("created_at", { ascending: false }).limit(60),
      db.from("demo_positions").select("*").order("opened_at", { ascending: false }).limit(80),
      db.from("demo_trades").select("*").order("created_at", { ascending: false }).limit(80),
    ]);

    if (acc) {
      setAccount({ ...acc, balance: num(acc.balance), realized_pnl: num(acc.realized_pnl) });
    }
    setOrders((ords.data ?? []).map((o: any) => ({
      ...o,
      price: o.price === null ? null : num(o.price),
      qty: num(o.qty),
      amount_usd: num(o.amount_usd),
      filled_price: o.filled_price === null ? null : num(o.filled_price),
    })));
    setPositions((pos.data ?? []).map((p: any) => ({
      ...p,
      entry_price: num(p.entry_price),
      qty: num(p.qty),
      margin: num(p.margin),
      liq_price: p.liq_price === null ? null : num(p.liq_price),
      pnl: num(p.pnl),
      close_price: p.close_price === null ? null : num(p.close_price),
    })));
    setTrades((trd.data ?? []).map((t: any) => ({
      ...t,
      price: num(t.price),
      qty: num(t.qty),
      amount_usd: num(t.amount_usd),
      fee: num(t.fee),
      pnl: num(t.pnl),
    })));
    setLoading(false);
  }, []);

  const tick = useCallback(async () => {
    const { data } = await db.rpc("demo_engine_tick");
    if (data && (data.fills > 0 || data.liquidations > 0 || data.botTrades > 0)) {
      await refresh();
    }
    return data;
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(() => {
      tick();
    }, 15000);
    return () => clearInterval(id);
  }, [tick]);

  const openPositions = positions.filter((p) => p.status === "open");
  const openOrders = orders.filter((o) => o.status === "open");

  return { account, orders, openOrders, positions, openPositions, trades, loading, refresh, tick };
};
