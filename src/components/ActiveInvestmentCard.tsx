import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { TrendingUp, Sparkles, Clock, ArrowUpRight, History, ChevronDown, FileDown } from "lucide-react";
import { useDailyRoi } from "@/hooks/useDailyRoi";
import { useEntitlements } from "@/hooks/useEntitlements";
import { generatePlanActivationReceipt } from "@/lib/planActivationReceipt";
import { PlanCashOutButton } from "@/components/PlanCashOutButton";
import { toast } from "sonner";



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
  template_id: string | null;
}

interface Band {
  roi_min: number;
  roi_max: number;
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

export const ActiveInvestmentCard = ({ userId, onCashedOut }: { userId: string; onCashedOut?: () => void }) => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [bands, setBands] = useState<Record<string, Band>>({});
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [account, setAccount] = useState({ name: "", email: "" });
  const { byInvestment } = useDailyRoi(userId);
  const { entitlements } = useEntitlements(userId);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: profile }, { data: auth }] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("user_id", userId).maybeSingle(),
        supabase.auth.getUser(),
      ]);
      if (!alive) return;
      setAccount({
        name: profile?.display_name ?? "",
        email: auth?.user?.email ?? "",
      });
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

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

      const { data: tpl } = await supabase
        .from("plan_templates")
        .select("id, roi_min, roi_max");
      if (!alive) return;
      const map: Record<string, Band> = {};
      (tpl ?? []).forEach((t: any) => {
        map[t.id] = { roi_min: Number(t.roi_min), roi_max: Number(t.roi_max) };
      });
      setBands(map);
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

        const stats = byInvestment[inv.id];
        const band = inv.template_id ? bands[inv.template_id] : undefined;
        const roiMin = band?.roi_min ?? Number(inv.daily_roi) * 0.6;
        const roiMax = band?.roi_max ?? Number(inv.daily_roi) * 1.4;
        const todayRoi = stats?.todayRoi ?? null;
        const avgRoi = stats?.avgRoi ?? Number(inv.daily_roi);
        const accrued = stats
          ? Number(inv.amount) * stats.effectiveSum
          : Number(inv.amount) * Number(inv.daily_roi) * elapsedDays;

        const downloadReceipt = () => {
          try {
            generatePlanActivationReceipt({
              investmentId: inv.id,
              templateId: inv.template_id,
              userId,
              accountName: account.name,
              accountEmail: account.email,
              planName: inv.plan_name,
              planId: inv.plan_id,
              tierRank: entitlements.tier_rank,
              principal: Number(inv.amount),
              durationDays: inv.duration_days,
              startedAt: inv.started_at,
              endsAt: inv.ends_at,
              todayRoi,
              avgRoi,
              roiMin,
              roiMax,
              accrued,
              withdrawalFeePct: entitlements.withdrawal_fee_pct,
              dailyWithdrawalCap: entitlements.daily_withdrawal_cap,
              prioritySupport: entitlements.priority_support,
              premiumFeatures: entitlements.premium_features,
              communityAccess: entitlements.community_access,
            });
            toast.success("Activation receipt downloaded");
          } catch (error) {
            console.error("Activation receipt failed:", error);
            toast.error("Could not generate receipt");
          }
        };


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
                  <p className="text-xs text-muted-foreground">Today's ROI</p>
                  <p className="font-semibold text-lg tabular-nums">
                    {todayRoi !== null ? `${(todayRoi * 100).toFixed(2)}%` : "Rolling…"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Band {(roiMin * 100).toFixed(2)}–{(roiMax * 100).toFixed(2)}% · avg{" "}
                    {(avgRoi * 100).toFixed(2)}%
                  </p>
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

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-background/50"
                  onClick={downloadReceipt}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Download activation receipt
                </Button>
                <PlanCashOutButton
                  investmentId={inv.id}
                  planName={inv.plan_name}
                  principal={Number(inv.amount)}
                  profit={accrued}
                  onCashedOut={onCashedOut}
                  className="w-full"
                />

              </div>




              {stats && stats.rows.length > 0 && (
                <Collapsible className="mt-4">
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border border-border/60 bg-background/40 px-3 py-2 text-xs font-medium hover:bg-background/60">
                    <span className="flex items-center gap-1.5">
                      <History className="h-3.5 w-3.5" />
                      ROI history ({stats.rows.length} day{stats.rows.length === 1 ? "" : "s"})
                    </span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="max-h-52 overflow-y-auto rounded-md border border-border/60 divide-y divide-border/50">
                      {[...stats.rows]
                        .sort((a, b) => (a.roi_date < b.roi_date ? 1 : -1))
                        .map((r) => (
                          <div
                            key={r.roi_date}
                            className="flex items-center justify-between px-3 py-1.5 text-xs"
                          >
                            <span className="text-muted-foreground">
                              {new Date(`${r.roi_date}T00:00:00Z`).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                timeZone: "UTC",
                              })}
                            </span>
                            <span className="flex items-center gap-3 tabular-nums">
                              <span className="font-medium">{(Number(r.roi) * 100).toFixed(2)}%</span>
                              <span className="text-emerald-500">
                                +{formatUSD(Number(inv.amount) * Number(r.roi))}
                              </span>
                            </span>
                          </div>
                        ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};
