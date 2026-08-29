import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ThemeToggle } from "@/components/ThemeToggle";
import { EntitlementsCard } from "@/components/EntitlementsCard";
import { ActiveInvestmentCard } from "@/components/ActiveInvestmentCard";
import { ReferralLinkCard } from "@/components/ReferralLinkCard";
import { CttDebitCard } from "@/components/CttDebitCard";
import { SpendCardMerchants } from "@/components/SpendCardMerchants";
import { useDailyRoi } from "@/hooks/useDailyRoi";
import { useEntitlements } from "@/hooks/useEntitlements";
import { planBadgeUrl } from "@/lib/planBadges";
import {
  Crown,
  TrendingUp,
  Radio,
  ArrowRight,
  Wallet as WalletIcon,
  Bot,
  LineChart,
  Gauge,
  ShieldCheck,
  Trophy,
  FileText,
  Sparkles,
} from "lucide-react";

interface Investment {
  id: string;
  plan_name: string | null;
  plan_id: string;
  amount: number | string;
  daily_roi: number | string;
  duration_days: number | null;
  started_at: string;
  ends_at: string | null;
  status: string;
}

const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Plans whose daily ROI counts toward the General member portfolio balance. */
const COUNTED = ["general", "commissioner"];

const isCounted = (inv: Investment) => {
  const key = `${inv.plan_id ?? ""} ${inv.plan_name ?? ""}`.toLowerCase();
  return COUNTED.some((c) => key.includes(c));
};

const GeneralDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [portrait, setPortrait] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [, setTick] = useState(0);
  const { byInvestment } = useDailyRoi(user?.id);
  const { entitlements } = useEntitlements(user?.id);


  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) navigate("/auth");
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) navigate("/auth");
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("user_investments" as any)
        .select("id, plan_id, plan_name, amount, daily_roi, duration_days, started_at, ends_at, status")
        .eq("user_id", user.id)
        .eq("status", "active");
      if (alive) setInvestments(((data as any) ?? []) as Investment[]);
    };
    load();
    const channel = supabase
      .channel(`general_dash_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_investments", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      alive = false;
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user?.id]);

  const rows = useMemo(
    () =>
      investments.map((inv) => {
        const principal = Number(inv.amount);
        const stats = byInvestment[inv.id];
        const elapsedDays = Math.max(
          0,
          (Date.now() - new Date(inv.started_at).getTime()) / 86400000
        );
        const earned = stats
          ? principal * stats.effectiveSum
          : principal * Number(inv.daily_roi) * elapsedDays;
        const duration = Number(inv.duration_days || 0);
        return {
          inv,
          principal,
          earned,
          counted: isCounted(inv),
          todayPct: stats?.todayRoi != null ? stats.todayRoi * 100 : null,
          avgPct: (stats?.avgRoi ?? Number(inv.daily_roi)) * 100,
          progress: duration > 0 ? Math.min(100, (elapsedDays / duration) * 100) : 0,
        };
      }),
    [investments, byInvestment]
  );

  // Portfolio balance on this dashboard = daily ROI of the General and Commissioners plans only.
  const portfolioBalance = rows
    .filter((r) => r.counted)
    .reduce((a, r) => a + r.earned, 0);

  const lockedCapital = rows.reduce((a, r) => a + r.principal, 0);
  const hasGeneral = rows.some((r) =>
    `${r.inv.plan_id ?? ""} ${r.inv.plan_name ?? ""}`.toLowerCase().includes("general")
  );

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const generalBadge = planBadgeUrl("general");

  return (
    <div className="general-theme relative min-h-screen bg-background p-4">
      {/* ambient gold glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-70"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 0%, hsl(42 88% 55% / 0.18), transparent 70%)",
        }}
      />
      <div className="container relative mx-auto max-w-6xl py-10">
        {/* Header */}
        <Card className="general-glow mb-6 overflow-hidden border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card">
          <div className="flex flex-wrap items-center justify-between gap-6 p-6">
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/20 p-[2px]">
                  <div className="h-24 w-24 overflow-hidden rounded-2xl bg-muted sm:h-28 sm:w-28">
                    {portrait ? (
                      <img
                        src={portrait}
                        alt="General plan member portrait with gold plan shields"
                        className="h-full w-full object-cover object-top"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Crown className="h-8 w-8 text-primary" />
                      </div>
                    )}
                  </div>
                </div>
                {generalBadge && (
                  <img
                    src={generalBadge}
                    alt="General plan badge"
                    className="absolute -bottom-2 -right-2 h-10 w-10 drop-shadow"
                  />
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-bold leading-tight">General Member Dashboard</h1>
                  <Badge className="bg-primary/20 text-primary hover:bg-primary/20">
                    <Crown className="mr-1 h-3 w-3" /> Tier {entitlements.tier_rank || 5}
                  </Badge>
                  <span className="flex items-center gap-1 rounded-full bg-accent/15 px-2 py-1 text-xs text-accent">
                    <Radio className="h-3 w-3 animate-pulse" /> Live
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-primary">
                  {displayName || "General member"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {hasGeneral
                    ? "Highest tier active — full operating privileges unlocked."
                    : "Activate the General plan from your wallet to unlock every privilege."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <ThemeToggle />
              <Button size="sm" variant="outline" onClick={() => navigate("/wallet")}>
                <WalletIcon className="mr-2 h-4 w-4" /> Wallet
              </Button>
              <Button size="sm" onClick={() => navigate("/live-trading")}>
                <LineChart className="mr-2 h-4 w-4" /> Live Terminal
              </Button>
            </div>
          </div>
        </Card>


        {/* Totals */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card className="border-border bg-gradient-to-br from-primary/10 to-accent/10 p-6 md:col-span-2">
            <p className="text-sm text-muted-foreground">Total Portfolio Balance</p>
            <p className="mt-1 text-4xl font-bold tabular-nums">{usd(portfolioBalance)}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Counts the daily ROI of your General and Commissioners plans only
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => navigate("/wallet")}>
                <TrendingUp className="mr-2 h-4 w-4" /> Manage funds
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/transactions")}>
                <FileText className="mr-2 h-4 w-4" /> Statements
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/leaderboard")}>
                <Trophy className="mr-2 h-4 w-4" /> Leaderboard
              </Button>
            </div>
          </Card>
          <div className="grid gap-4">
            <Card className="border-border p-5">
              <p className="text-xs text-muted-foreground">Total profit</p>
              <p className="text-2xl font-bold tabular-nums">$0.00</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                New dashboard baseline — profit accrues from here
              </p>
            </Card>
            <Card className="border-border p-5">
              <p className="text-xs text-muted-foreground">Total amount value</p>
              <p className="text-2xl font-bold tabular-nums">$0.00</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Locked capital {usd(lockedCapital)} in active plans
              </p>
            </Card>
          </div>
        </div>

        {/* Benefits */}
        <EntitlementsCard userId={user.id} />

        <Card className="mb-6 border-border p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" /> General member privileges
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Gauge,
                title: "Highest daily ROI band",
                body: "2.88% – 6.72% variable daily, 90-day cycle",
                action: () => navigate("/investment-plans"),
                label: "View plans",
              },
              {
                icon: LineChart,
                title: "Live trading terminal",
                body: "Card-funded spot terminal with withdrawals",
                action: () => navigate("/live-trading"),
                label: "Open terminal",
              },
              {
                icon: Bot,
                title: "Automated bots",
                body: "Grid, DCA and AI strategies included",
                action: () => navigate("/trading-bots"),
                label: "Manage bots",
              },
              {
                icon: Sparkles,
                title: "Priority desk",
                body: `${(entitlements.withdrawal_fee_pct * 100).toFixed(2)}% withdrawal fee · $${entitlements.daily_withdrawal_cap.toLocaleString()} daily cap`,
                action: () => navigate("/chat"),
                label: "Talk to advisor",
              },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-muted/30 p-4">
                <f.icon className="mb-2 h-4 w-4 text-primary" />
                <p className="font-medium">{f.title}</p>
                <p className="mb-3 text-[11px] text-muted-foreground">{f.body}</p>
                <Button size="sm" variant="outline" onClick={f.action}>
                  {f.label} <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Spend card */}
        <div className="mb-6 grid gap-4 lg:grid-cols-2 lg:items-start">
          <CttDebitCard userId={user.id} portfolioUsd={portfolioBalance} />
          <ReferralLinkCard userId={user.id} />
        </div>

        <SpendCardMerchants userId={user.id} />

        {/* Plan performance */}
        <Card className="mb-6 border-border p-6">
          <h3 className="mb-4 font-semibold">Plan performance</h3>
          {rows.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No active plans yet.
            </p>
          ) : (
            <div className="space-y-3">
              {rows.map((r) => (
                <div key={r.inv.id} className="rounded-lg border border-border p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {planBadgeUrl(r.inv.plan_id) && (
                        <img
                          src={planBadgeUrl(r.inv.plan_id)!}
                          alt={`${r.inv.plan_name} badge`}
                          className="h-7 w-7"
                        />
                      )}
                      <div>
                        <p className="font-medium">{r.inv.plan_name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {r.todayPct != null
                            ? `${r.todayPct.toFixed(2)}% today · avg ${r.avgPct.toFixed(2)}%`
                            : `avg ${r.avgPct.toFixed(2)}% daily`}
                          {r.counted ? " · counted in portfolio balance" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {usd(r.principal)}{" "}
                        <span className="text-xs text-muted-foreground">locked</span>
                      </p>
                      <p className="text-xs tabular-nums text-emerald-500">
                        + {usd(r.earned)} ROI
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

        <ActiveInvestmentCard userId={user.id} />
      </div>
    </div>
  );
};

export default GeneralDashboard;
