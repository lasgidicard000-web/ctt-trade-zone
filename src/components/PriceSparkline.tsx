import { useMemo, useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface PriceSparklineProps {
  currentPrice: number;
  change24h: number;
  symbol: string;
}

interface PricePoint {
  time: number;
  price: number;
}

export const PriceSparkline = ({ currentPrice, change24h, symbol }: PriceSparklineProps) => {
  const [historyData, setHistoryData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // Fetch last 24 hours of price history
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const { data, error } = await supabase
          .from('coin_price_history')
          .select('price, timestamp')
          .eq('coin_symbol', symbol.toUpperCase())
          .gte('timestamp', twentyFourHoursAgo.toISOString())
          .order('timestamp', { ascending: true })
          .limit(48);

        if (!error && data && data.length > 0) {
          const points = data.map((d, i) => ({
            time: i,
            price: typeof d.price === 'string' ? parseFloat(d.price) : d.price,
          }));
          setHistoryData(points);
        } else {
          // Fall back to simulated data if no history available
          setHistoryData(generateSimulatedData());
        }
      } catch (err) {
        console.error('Error fetching price history:', err);
        setHistoryData(generateSimulatedData());
      } finally {
        setLoading(false);
      }
    };

    const generateSimulatedData = (): PricePoint[] => {
      const points = 24;
      const startPrice = currentPrice / (1 + change24h / 100);
      const priceRange = currentPrice - startPrice;
      
      return Array.from({ length: points }, (_, i) => {
        const progress = i / (points - 1);
        const trend = startPrice + priceRange * progress;
        const variation = (Math.sin(i * 0.8) + Math.cos(i * 1.2)) * Math.abs(priceRange) * 0.1;
        return {
          time: i,
          price: trend + variation,
        };
      });
    };

    fetchHistory();
  }, [symbol, currentPrice, change24h]);

  const data = historyData.length > 0 ? historyData : useMemo(() => {
    const points = 24;
    const startPrice = currentPrice / (1 + change24h / 100);
    const priceRange = currentPrice - startPrice;
    
    return Array.from({ length: points }, (_, i) => {
      const progress = i / (points - 1);
      const trend = startPrice + priceRange * progress;
      const variation = (Math.sin(i * 0.8) + Math.cos(i * 1.2)) * Math.abs(priceRange) * 0.1;
      return {
        time: i,
        price: trend + variation,
      };
    });
  }, [currentPrice, change24h]);

  const isPositive = change24h >= 0;
  const strokeColor = isPositive ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)";

  if (loading) {
    return (
      <div className="w-full h-10 flex items-center justify-center">
        <div className="h-1 w-16 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="w-full h-10">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis domain={['dataMin', 'dataMax']} hide />
          <Line
            type="monotone"
            dataKey="price"
            stroke={strokeColor}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
