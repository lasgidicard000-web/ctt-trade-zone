import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";

interface Point {
  timestamp: string;
  price: number;
}

const synthetic = (price: number, points: number, spanMinutes: number): Point[] => {
  const out: Point[] = [];
  let p = price * 0.985;
  const now = Date.now();
  for (let i = points; i >= 0; i--) {
    p = p * (1 + (Math.random() - 0.48) * 0.006);
    out.push({
      timestamp: new Date(now - i * spanMinutes * 60000).toISOString(),
      price: Number(p.toFixed(price >= 1000 ? 2 : 5)),
    });
  }
  if (out.length) out[out.length - 1].price = price;
  return out;
};

export const PairChart = ({ symbol, price }: { symbol: string; price: number }) => {
  const [timeframe, setTimeframe] = useState<"1h" | "24h" | "7d">("24h");
  const [data, setData] = useState<Point[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const start = new Date();
      if (timeframe === "1h") start.setHours(start.getHours() - 1);
      if (timeframe === "24h") start.setHours(start.getHours() - 24);
      if (timeframe === "7d") start.setDate(start.getDate() - 7);

      const { data: rows } = await supabase
        .from("coin_price_history")
        .select("timestamp, price")
        .eq("coin_symbol", symbol)
        .gte("timestamp", start.toISOString())
        .order("timestamp", { ascending: true });

      if (cancelled) return;

      if (rows && rows.length > 4) {
        setData(rows.map((r: any) => ({ timestamp: r.timestamp, price: parseFloat(String(r.price)) })));
      } else if (price > 0) {
        const cfg = { "1h": [60, 1], "24h": [96, 15], "7d": [84, 120] } as const;
        const [pts, span] = cfg[timeframe];
        setData(synthetic(price, pts, span));
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, timeframe]);

  const fmtX = (t: string) =>
    format(new Date(t), timeframe === "7d" ? "MMM dd" : "HH:mm");

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{symbol}/USDT chart</span>
        <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as typeof timeframe)}>
          <TabsList className="h-8">
            <TabsTrigger value="1h" className="h-6 px-2 text-xs">1H</TabsTrigger>
            <TabsTrigger value="24h" className="h-6 px-2 text-xs">24H</TabsTrigger>
            <TabsTrigger value="7d" className="h-6 px-2 text-xs">7D</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="demoPriceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="timestamp" tickFormatter={fmtX} stroke="hsl(var(--muted-foreground))" style={{ fontSize: 11 }} />
          <YAxis
            domain={["auto", "auto"]}
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: 11 }}
            tickFormatter={(v) => `$${Number(v).toLocaleString()}`}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(l) => format(new Date(l as string), "MMM dd, HH:mm")}
            formatter={(v) => [`$${Number(v).toLocaleString()}`, "Price"]}
          />
          <Area type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#demoPriceFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PairChart;
