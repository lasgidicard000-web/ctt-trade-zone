import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { format } from "date-fns";

interface PriceHistoryData {
  timestamp: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CCTPriceChartProps {
  currentPrice: number;
}

export const CCTPriceChart = ({ currentPrice }: CCTPriceChartProps) => {
  const [priceHistory, setPriceHistory] = useState<PriceHistoryData[]>([]);
  const [timeframe, setTimeframe] = useState<"1h" | "24h" | "7d">("24h");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPriceHistory();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('cct-price-history')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'coin_price_history',
          filter: 'coin_symbol=eq.CCT'
        },
        (payload) => {
          setPriceHistory((current) => [
            ...current,
            {
              timestamp: payload.new.timestamp,
              price: parseFloat(payload.new.price.toString()),
              open: parseFloat(payload.new.open.toString()),
              high: parseFloat(payload.new.high.toString()),
              low: parseFloat(payload.new.low.toString()),
              close: parseFloat(payload.new.close.toString()),
              volume: parseFloat(payload.new.volume.toString()),
            }
          ].slice(-100)); // Keep last 100 points
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [timeframe]);

  const fetchPriceHistory = async () => {
    setLoading(true);
    
    // Calculate time range based on selected timeframe
    const now = new Date();
    let startTime = new Date();
    
    switch (timeframe) {
      case "1h":
        startTime.setHours(now.getHours() - 1);
        break;
      case "24h":
        startTime.setHours(now.getHours() - 24);
        break;
      case "7d":
        startTime.setDate(now.getDate() - 7);
        break;
    }

    const { data, error } = await supabase
      .from("coin_price_history")
      .select("*")
      .eq("coin_symbol", "CCT")
      .gte("timestamp", startTime.toISOString())
      .order("timestamp", { ascending: true });

    if (!error && data) {
      const formattedData = data.map((item) => ({
        timestamp: item.timestamp,
        price: parseFloat(item.price.toString()),
        open: parseFloat(item.open.toString()),
        high: parseFloat(item.high.toString()),
        low: parseFloat(item.low.toString()),
        close: parseFloat(item.close.toString()),
        volume: parseFloat(item.volume.toString()),
      }));
      setPriceHistory(formattedData);
    }
    
    setLoading(false);
  };

  const formatXAxis = (timestamp: string) => {
    const date = new Date(timestamp);
    switch (timeframe) {
      case "1h":
        return format(date, "HH:mm");
      case "24h":
        return format(date, "HH:mm");
      case "7d":
        return format(date, "MMM dd");
      default:
        return format(date, "HH:mm");
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Card className="p-3 bg-background/95 backdrop-blur-sm border-border">
          <p className="text-xs text-muted-foreground mb-2">
            {format(new Date(data.timestamp), "MMM dd, HH:mm")}
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Price:</span>
              <span className="font-semibold">${data.price.toFixed(4)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">High:</span>
              <span className="text-accent">${data.high.toFixed(4)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Low:</span>
              <span className="text-destructive">${data.low.toFixed(4)}</span>
            </div>
          </div>
        </Card>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">Loading chart...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">CCT Price Chart</h3>
        <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as "1h" | "24h" | "7d")}>
          <TabsList>
            <TabsTrigger value="1h">1H</TabsTrigger>
            <TabsTrigger value="24h">24H</TabsTrigger>
            <TabsTrigger value="7d">7D</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {priceHistory.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          <div className="text-center">
            <p>No historical data available yet</p>
            <p className="text-sm mt-2">Price history will appear as trading occurs</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={priceHistory}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatXAxis}
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `$${value.toFixed(2)}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPrice)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};
