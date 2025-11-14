import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

interface SnapshotData {
  created_at: string;
  total_value: number;
}

interface PerformanceChartProps {
  snapshots: SnapshotData[];
}

type TimeRange = "1D" | "1W" | "1M" | "ALL";

const PerformanceChart = ({ snapshots }: PerformanceChartProps) => {
  const [timeRange, setTimeRange] = useState<TimeRange>("1W");

  const filterSnapshotsByRange = (range: TimeRange): SnapshotData[] => {
    if (range === "ALL") return snapshots;

    const now = new Date();
    const cutoffDate = new Date();

    switch (range) {
      case "1D":
        cutoffDate.setDate(now.getDate() - 1);
        break;
      case "1W":
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case "1M":
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
    }

    return snapshots.filter((s) => new Date(s.created_at) >= cutoffDate);
  };

  const filteredData = filterSnapshotsByRange(timeRange);

  const chartData = filteredData.map((snapshot) => ({
    time: format(new Date(snapshot.created_at), "MMM dd HH:mm"),
    value: Number(snapshot.total_value),
  }));

  const getPerformanceChange = () => {
    if (filteredData.length < 2) return { value: 0, percentage: 0 };

    const firstValue = Number(filteredData[filteredData.length - 1].total_value);
    const lastValue = Number(filteredData[0].total_value);
    const change = lastValue - firstValue;
    const percentage = firstValue > 0 ? (change / firstValue) * 100 : 0;

    return { value: change, percentage };
  };

  const performance = getPerformanceChange();

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Portfolio Performance</h2>
          {filteredData.length >= 2 && (
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`text-lg font-semibold ${
                  performance.value >= 0 ? "text-accent" : "text-destructive"
                }`}
              >
                {performance.value >= 0 ? "+" : ""}$
                {performance.value.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span
                className={`text-sm ${
                  performance.percentage >= 0 ? "text-accent" : "text-destructive"
                }`}
              >
                ({performance.percentage >= 0 ? "+" : ""}
                {performance.percentage.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-1">
          {(["1D", "1W", "1M", "ALL"] as TimeRange[]).map((range) => (
            <Button
              key={range}
              onClick={() => setTimeRange(range)}
              variant={timeRange === range ? "default" : "outline"}
              size="sm"
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="time"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              stroke="hsl(var(--border))"
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              stroke="hsl(var(--border))"
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(value: number) => [
                `$${value.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`,
                "Portfolio Value",
              ]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[300px] items-center justify-center">
          <p className="text-muted-foreground">
            No performance data available yet. Start trading to see your portfolio performance!
          </p>
        </div>
      )}
    </Card>
  );
};

export default PerformanceChart;
