import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Crown, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { planBadgeUrl } from "@/lib/planBadges";

interface Props {
  userId: string;
  /** Spendable (unlocked) wallet value in USD */
  availableUsd: number;
  btcBalance: number;
  usdtBalance: number;
  btcPrice: number;
  onUpgraded?: () => void;
}

interface Template {
  id: string;
  name: string;
  principal_min: number;
  duration_days: number;
  daily_roi: number;
  roi_min: number;
  roi_max: number;
}

const usd = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const GeneralUpgradeBanner = ({
  userId,
  availableUsd,
  btcBalance,
  usdtBalance,
  btcPrice,
  onUpgraded,
}: Props) => {
  const navigate = useNavigate();
  const [tpl, setTpl] = useState<Template | null>(null);
  const [hasGeneral, setHasGeneral] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [{ data: template }, { data: inv }] = await Promise.all([
      supabase
        .from("plan_templates" as any)
        .select("id, name, principal_min, duration_days, daily_roi, roi_min, roi_max")
        .ilike("name", "%general%")
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("user_investments" as any)
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .ilike("plan_name", "%general%")
        .limit(1),
    ]);
    setTpl((template as any) ?? null);
    setHasGeneral(((inv as any[]) ?? []).length > 0);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  if (hasGeneral === null || !tpl) return null;

  const required = Number(tpl.principal_min);

  if (hasGeneral) {
    return (
      <Card className="mb-6 overflow-hidden border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {planBadgeUrl("general") && (
              <img src={planBadgeUrl("general")!} alt="General plan badge" className="h-10 w-10" />
            )}
            <div>
              <p className="font-semibold">You are a General plan member</p>
              <p className="text-sm text-muted-foreground">
                Open your General member dashboard for full tier benefits.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => navigate("/general")}>
            Open General Dashboard <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  }

  // Only offer the upgrade when a supported funding source (USDT or BTC) can
  // actually cover the principal — otherwise Accept would always fail.
  const btcUsd = btcPrice > 0 ? btcBalance * btcPrice : 0;
  const payableUsd = Math.max(usdtBalance, btcUsd);

  if (availableUsd < required || payableUsd < required) return null;

  const accept = async () => {
    setBusy(true);
    try {
      const useUsdt = usdtBalance >= required;
      if (useUsdt) {
        const { error } = await supabase
          .from("wallet_balances")
          .update({ balance: usdtBalance - required })
          .eq("user_id", userId)
          .eq("coin_symbol", "USDT");
        if (error) throw error;
      } else {
        if (btcBalance * btcPrice < required) throw new Error("Insufficient BTC balance");
        const { error } = await supabase
          .from("wallet_balances")
          .update({ balance: btcBalance - required / btcPrice })
          .eq("user_id", userId)
          .eq("coin_symbol", "BTC");
        if (error) throw error;
      }

      const startedAt = new Date();
      const endsAt = new Date(
        startedAt.getTime() + Number(tpl.duration_days) * 24 * 60 * 60 * 1000
      );

      const { error: invErr } = await supabase.from("user_investments" as any).insert({
        user_id: userId,
        plan_id: "general",
        plan_name: tpl.name,
        amount: required,
        daily_roi: Number(tpl.daily_roi),
        duration_days: Number(tpl.duration_days),
        status: "active",
        started_at: startedAt.toISOString(),
        ends_at: endsAt.toISOString(),
        template_id: tpl.id,
      });

      if (invErr) {
        // roll the debit back
        await supabase
          .from("wallet_balances")
          .update({ balance: useUsdt ? usdtBalance : btcBalance })
          .eq("user_id", userId)
          .eq("coin_symbol", useUsdt ? "USDT" : "BTC");
        throw invErr;
      }

      await supabase.from("transactions").insert({
        user_id: userId,
        type: "plan_purchase",
        from_symbol: useUsdt ? "USDT" : "BTC",
        amount: required,
        status: "completed",
        notes: `${tpl.name} activated — General member dashboard unlocked`,
      });

      await supabase.rpc("roll_investment_daily_roi" as any);

      toast.success("Welcome to the General plan", {
        description: `$${usd(required)} locked for ${tpl.duration_days} days.`,
      });
      await load();
      onUpgraded?.();
      navigate("/general");
    } catch (e: any) {
      toast.error(e.message || "Upgrade failed");
    } finally {
      setBusy(false);
    }
  };

  const roiMin = Number(tpl.roi_min ?? tpl.daily_roi) * 100;
  const roiMax = Number(tpl.roi_max ?? tpl.daily_roi) * 100;

  return (
    <Card className="mb-6 overflow-hidden border-amber-500/50 bg-gradient-to-br from-amber-500/15 via-primary/10 to-accent/10">
      <div className="p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {planBadgeUrl("general") ? (
            <img src={planBadgeUrl("general")!} alt="General plan badge" className="h-12 w-12" />
          ) : (
            <span className="rounded-full bg-amber-500/20 p-2">
              <Crown className="h-5 w-5 text-amber-500" />
            </span>
          )}
          <div>
            <Badge className="mb-1 bg-amber-500/20 text-amber-600 hover:bg-amber-500/20">
              Eligibility unlocked
            </Badge>
            <h2 className="text-xl font-bold leading-tight">
              You now have the complete amount to get the General plan
            </h2>
          </div>
        </div>

        <p className="mb-5 text-sm text-muted-foreground">
          Click <span className="font-semibold text-foreground">Accept</span> and your dashboard
          automatically becomes that of a General plan member — you gain the abilities to operate
          and benefit from every stated eligibility of a General plan member.
        </p>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-background/60 p-3">
            <p className="text-xs text-muted-foreground">Principal to lock</p>
            <p className="text-lg font-semibold tabular-nums">${usd(required)}</p>
          </div>
          <div className="rounded-lg bg-background/60 p-3">
            <p className="text-xs text-muted-foreground">Available balance</p>
            <p className="text-lg font-semibold tabular-nums">${usd(availableUsd)}</p>
          </div>
          <div className="rounded-lg bg-background/60 p-3">
            <p className="text-xs text-muted-foreground">Daily ROI range</p>
            <p className="text-lg font-semibold tabular-nums text-emerald-500">
              {roiMin.toFixed(2)}–{roiMax.toFixed(2)}%
            </p>
          </div>
        </div>

        <Button onClick={accept} disabled={busy} size="lg">
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Activating General plan...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" /> Accept & become a General member
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};
