import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Sparkles, Clock, ArrowUpRight } from "lucide-react";

interface Investment {
  id: string;
  plan_id: string;
  plan_name: string;
  amount: number;
  daily_roi: number;
  duration_days: number;
  status: string;
  started_at: string;
  ends_at: string;
}

const badgeStyle = (planId: string) => {
  switch (planId) {
    case "recruit": return "bg-amber-700/20 text-amber-500 border-amber-700/30";
    case "inspectors": return "bg-slate-400/20 text-slate-300 border-slate-400/30";
    case "superintendent": return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
    case "commissioners": return "bg-cyan-400/20 text-cyan-300 border-cyan-400/30";
    case "general": return "bg-purple-400/20 text-purple-300 border-purple-400/30";
    default: return "bg-primary/20 text-primary border-primary/30";
  }
};

const gradientFor = (planId: string) => {
  switch (planId) {
    case "recruit": return "from-amber-600/20 to-amber-800/10";
    case "inspectors": return "from-slate-400/20 to-slate-600/10";
    case "superintendent": return "from-yellow-500/20 to-yellow-700/10";
    case "commissioners": return "from-cyan-500/20 to-blue-600/10";
    case "general": return "from-purple-500/20 to-fuchsia-600/10";
    default: return "from-primary/20 to-primary/5";
  }
};

const formatUSD = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export const ActiveInvestmentCard = ({ userId }: { userId: string }) => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("user_investments")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("started_at", { ascending: false });
      if (!alive) return;
      setInvestments((data ?? []) as Investment[]);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`user_investments_${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_investments", filter: `user_id=eq.${userId}` },
        () => load()
      )
      .subscribe();

    const interval = setInterval(() => setTick((t) => t + 1), 1000);

    return () => {
      alive = false;
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [userId]);

  if (loading) return null;

  if (investments.length === 0) {
    return (
      <Card className="mb-6 p-5 border-dashed">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">No active investment</p>
              <p className="text-sm text-muted-foreground">Activate a plan to start earning daily ROI.</p>
            </div>
          </div>
          <Button asChild size="sm">
            <Link to="/investment-plans">
              Browse plans <ArrowUpRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="mb-6 space-y-4">
      {investments.map((inv) => {
        const startedMs = new Date(inv.started_at).getTime();
        const endsMs = new Date(inv.ends_at).getTime();
        const now = Date.now() + tick * 0; // tick triggers re-render
        void tick;
        const elapsedMs = Math.max(0, Date.now() - startedMs);
        const totalMs = endsMs - startedMs;
        const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
        const progressPct = Math.min(100, (elapsedMs / totalMs) * 100);
        const daysRemaining = Math.max(0, Math.ceil((endsMs - Date.now()) / (1000 * 60 * 60 * 24)));
        const accrued = Number(inv.amount) * Number(inv.daily_roi) * elapsedDays;

        return (
          <Card
            key={inv.id}
            className={`relative overflow-hidden border-primary/20 bg-gradient-to-br ${gradientFor(inv.plan_id)}`}
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-background/60 backdrop-blur flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{inv.plan_name}</h3>
                      <Badge variant="outline" className={badgeStyle(inv.plan_id)}>
                        {inv.plan_id}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Active Investment</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-medium text-emerald-500 uppercase tracking-wide">Running</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Principal</p>
                  <p className="font-semibold text-lg">{formatUSD(Number(inv.amount))}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Daily ROI</p>
                  <p className="font-semibold text-lg">{(Number(inv.daily_roi) * 100).toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Accrued Profit</p>
                  <p className="font-semibold text-lg text-emerald-500 tabular-nums">
                    {formatUSD(accrued)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Value</p>
                  <p className="font-semibold text-lg tabular-nums">
                    {formatUSD(Number(inv.amount) + accrued)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Day {Math.floor(elapsedDays)} of {inv.duration_days}
                  </span>
                  <span className="font-medium">
                    {daysRemaining} day{daysRemaining === 1 ? "" : "s"} remaining
                  </span>
                </div>
                <Progress value={progressPct} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Ends {new Date(inv.ends_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
