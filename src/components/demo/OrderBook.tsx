import { useEffect, useMemo, useState } from "react";

interface Level {
  price: number;
  qty: number;
  total: number;
}

interface Tape {
  price: number;
  qty: number;
  side: "buy" | "sell";
  time: string;
}

const decimals = (price: number) => (price >= 1000 ? 2 : price >= 1 ? 3 : 5);

export const OrderBook = ({ price, symbol }: { price: number; symbol: string }) => {
  const [seed, setSeed] = useState(0);
  const [tape, setTape] = useState<Tape[]>([]);

  useEffect(() => {
    const id = setInterval(() => setSeed((s) => s + 1), 1600);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!price) return;
    const jitter = (Math.random() - 0.5) * price * 0.0006;
    setTape((prev) =>
      [
        {
          price: price + jitter,
          qty: Number((Math.random() * 1.4 + 0.02).toFixed(4)),
          side: (jitter >= 0 ? "buy" : "sell") as "buy" | "sell",
          time: new Date().toLocaleTimeString([], { hour12: false }),
        },
        ...prev,
      ].slice(0, 18),
    );
  }, [seed, price]);

  const { asks, bids, maxTotal } = useMemo(() => {
    const step = price * 0.0004 || 0.01;
    const build = (dir: 1 | -1) => {
      let running = 0;
      return Array.from({ length: 11 }, (_, i) => {
        const qty = Number((Math.random() * 2.2 + 0.05).toFixed(4));
        running += qty;
        return { price: price + dir * step * (i + 1), qty, total: Number(running.toFixed(4)) };
      });
    };
    const a = build(1).reverse();
    const b = build(-1);
    const max = Math.max(...a.map((l) => l.total), ...b.map((l) => l.total), 1);
    return { asks: a, bids: b, maxTotal: max };
  }, [price, seed]);

  const d = decimals(price);

  const Row = ({ level, type }: { level: Level; type: "ask" | "bid" }) => (
    <div className="relative grid grid-cols-3 px-3 py-[3px] text-[11px] font-mono tabular-nums">
      <div
        className={`absolute inset-y-0 right-0 ${type === "ask" ? "bg-destructive/10" : "bg-primary/10"}`}
        style={{ width: `${(level.total / maxTotal) * 100}%` }}
      />
      <span className={`relative ${type === "ask" ? "text-destructive" : "text-primary"}`}>
        {level.price.toFixed(d)}
      </span>
      <span className="relative text-right text-foreground">{level.qty.toFixed(4)}</span>
      <span className="relative text-right text-muted-foreground">{level.total.toFixed(3)}</span>
    </div>
  );

  return (
    <div className="flex flex-col divide-y divide-border">
      <div className="grid grid-cols-3 px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground">
        <span>Price</span>
        <span className="text-right">Size ({symbol})</span>
        <span className="text-right">Total</span>
      </div>
      <div>{asks.map((l, i) => <Row key={`a${i}`} level={l} type="ask" />)}</div>
      <div className="px-3 py-2 font-mono text-base font-semibold text-foreground">
        {price ? price.toFixed(d) : "—"}
        <span className="ml-2 text-[10px] font-normal uppercase text-muted-foreground">Last</span>
      </div>
      <div>{bids.map((l, i) => <Row key={`b${i}`} level={l} type="bid" />)}</div>
      <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        Recent trades
      </div>
      <div className="max-h-48 overflow-y-auto">
        {tape.map((t, i) => (
          <div key={i} className="grid grid-cols-3 px-3 py-[3px] text-[11px] font-mono tabular-nums">
            <span className={t.side === "buy" ? "text-primary" : "text-destructive"}>
              {t.price.toFixed(d)}
            </span>
            <span className="text-right">{t.qty.toFixed(4)}</span>
            <span className="text-right text-muted-foreground">{t.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderBook;
