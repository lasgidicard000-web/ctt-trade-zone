export interface PnlTrade {
  id: string;
  symbol: string;
  side: string;
  price: number;
  qty: number;
  fee: number;
  pnl: number;
  created_at: string;
}

export type TradePnlInfo =
  | { kind: "realised"; pnl: number }
  | { kind: "unrealised"; pnl: number; openQty: number; market: number | null }
  | { kind: "closed"; closedBy: string | null };

/** FIFO-match buys to sells per symbol; open buy lots get live unrealised P&L at market. */
export function computeTradePnl(
  trades: PnlTrade[],
  prices: Map<string, number>,
): Map<string, TradePnlInfo> {
  const out = new Map<string, TradePnlInfo>();
  const sorted = [...trades].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const lots = new Map<string, { t: PnlTrade; left: number; closedBy: string | null }[]>();
  for (const t of sorted) {
    const q = lots.get(t.symbol) ?? [];
    lots.set(t.symbol, q);
    if (t.side === "buy") {
      q.push({ t, left: t.qty, closedBy: null });
    } else {
      out.set(t.id, { kind: "realised", pnl: t.pnl });
      let rem = t.qty;
      for (const lot of q) {
        if (rem <= 1e-10) break;
        if (lot.left <= 1e-10) continue;
        const take = Math.min(lot.left, rem);
        lot.left -= take;
        rem -= take;
        lot.closedBy = t.id;
      }
    }
  }
  for (const [sym, q] of lots) {
    const market = prices.get(sym) ?? null;
    for (const lot of q) {
      if (lot.left <= 1e-8) {
        out.set(lot.t.id, { kind: "closed", closedBy: lot.closedBy });
      } else {
        const feeShare = lot.t.qty > 0 ? lot.t.fee * (lot.left / lot.t.qty) : 0;
        const pnl = market === null ? 0 : (market - lot.t.price) * lot.left - feeShare;
        out.set(lot.t.id, { kind: "unrealised", pnl, openQty: lot.left, market });
      }
    }
  }
  return out;
}
