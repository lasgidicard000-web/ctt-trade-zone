import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Wallet as WalletIcon, TrendingUp, Lock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Investment {
  plan_name?: string | null;
  amount: number | string;
  daily_roi: number | string;
  duration_days?: number | null;
  started_at: string;
  ends_at?: string | null;
}

interface Props {
  depositsUsd: number;
  investments: Investment[];
}

const fmt = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const PortfolioBreakdown = ({ depositsUsd, investments }: Props) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const rows = investments.map((inv) => {
    const principal = Number(inv.amount);
    const roi = Number(inv.daily_roi);
    const started = new Date(inv.started_at).getTime();
    const elapsedDays = Math.max(0, (Date.now() - started) / 86400000);
    const earned = principal * roi * elapsedDays;
    const duration = Number(inv.duration_days || 0);
    const progress = duration > 0 ? Math.min(100, (elapsedDays / duration) * 100) : 0;
    return {
      name: inv.plan_name || "Plan",
      principal,
      earned,
      progress,
      dailyPct: roi * 100,
    };
  });

  const lockedTotal = rows.reduce((a, r) => a + r.principal, 0);
  const earnedTotal = rows.reduce((a, r) => a + r.earned, 0);

  return (
    <Card className="mb-6 border-border p-6">
      <h3 className="mb-4 text-lg font-semibold">Portfolio Breakdown</h3>

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <WalletIcon className="h-3.5 w-3.5" /> Deposits available
          </div>
          <p className="text-xl font-bold tabular-nums">{fmt(depositsUsd)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Withdrawable / usable to purchase plans
          </p>
        </div>
        <div className="rounded-lg border border-border bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> Daily ROI earned
          </div>
          <p className="text-xl font-bold tabular-nums text-emerald-500">
            {fmt(earnedTotal)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Live accrued across all active plans
          </p>
        </div>
        <div className="rounded-lg border border-border bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Lock className="h-3.5 w-3.5 text-amber-500" /> Locked capital
          </div>
          <p className="text-xl font-bold tabular-nums text-amber-500">
            {fmt(lockedTotal)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Principal committed to active plans
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No active plans yet. Purchase a plan to start earning daily ROI.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Per-plan breakdown
          </p>
          {rows.map((r, i) => (
            <div key={i} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {r.dailyPct.toFixed(2)}% daily ROI
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {fmt(r.principal)}{" "}
                    <span className="text-xs text-muted-foreground">locked</span>
                  </p>
                  <p className="text-xs text-emerald-500 tabular-nums">
                    + {fmt(r.earned)} earned
                  </p>
                </div>
              </div>
              <Progress value={r.progress} className="h-1.5" />
              <p className="mt-1 text-[11px] text-muted-foreground">
                {r.progress.toFixed(1)}% of cycle complete
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
