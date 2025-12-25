import { useMemo } from "react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

interface PriceSparklineProps {
  currentPrice: number;
  change24h: number;
  symbol: string;
}

export const PriceSparkline = ({ currentPrice, change24h, symbol }: PriceSparklineProps) => {
  // Generate simulated price history based on current price and 24h change
  const data = useMemo(() => {
    const points = 24; // 24 data points representing hourly data
    const startPrice = currentPrice / (1 + change24h / 100);
    const priceRange = currentPrice - startPrice;
    
    return Array.from({ length: points }, (_, i) => {
      // Create a smooth curve with some variation
      const progress = i / (points - 1);
      const trend = startPrice + priceRange * progress;
      // Add small random variation (±1% of price range)
      const variation = (Math.sin(i * 0.8) + Math.cos(i * 1.2)) * Math.abs(priceRange) * 0.1;
      return {
        time: i,
        price: trend + variation,
      };
    });
  }, [currentPrice, change24h]);

  const isPositive = change24h >= 0;
  const strokeColor = isPositive ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)";

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
