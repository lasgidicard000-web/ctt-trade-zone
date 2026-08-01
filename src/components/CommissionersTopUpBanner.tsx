import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpCircle, CheckCircle2, Sparkles, Crown } from "lucide-react";

interface Props {
  userId: string;
  portfolioUsd: number;
  onTopUp: () => void;
  onActivate: () => void;
}

const usd = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const CommissionersTopUpBanner = ({ userId, portfolioUsd, onTopUp, onActivate }: Props) => {
  const [required, setRequired] = useState<number>(5000);
  const [dailyRoi, setDailyRoi] = useState<number | null>(null);
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [hasPlan, setHasPlan] = useState<boolean | null>(null);

  useEffect(() => {
    const load = async () => {
      const [{ data: tpl }, { data: inv }] = await Promise.all([
        supabase
          .from("plan_templates")
          .select("principal_min, daily_roi, duration_days")
          .ilike("name", "%commissioner%")
          .eq("is_active", true)
          .maybeSingle(),
        supabase
          .from("user_investments")
          .select("id")
          .eq("user_id", userId)
          .eq("status", "active")
          .ilike("plan_name", "%commissioner%")
          .limit(1),
      ]);

      if (tpl) {
        setRequired(Number(tpl.principal_min));
        setDailyRoi(Number(tpl.daily_roi));
        setDurationDays(Number(tpl.duration_days));
      }
      setHasPlan((inv?.length ?? 0) > 0);
    };
    load();
  }, [userId]);

  if (hasPlan === null) return null;

  if (hasPlan) {
    return (
      <Card className="mb-6 border-accent/40 bg-accent/5 p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-accent" />
          <div>
            <p className="font-semibold">Commissioners Plan active</p>
            <p className="text-sm text-muted-foreground">
              Your CTTTRADEZONE wallet dashboard is running the Commissioners strategy.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const shortfall = Math.max(0, required - portfolioUsd);

  return (
    <Card className="mb-6 overflow-hidden border-primary/40 bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10">
      <div className="p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-primary/15 p-2">
            <Crown className="h-5 w-5 text-primary" />
          </span>
          <div>
            <Badge variant="secondary" className="mb-1 text-xs">
              Action required
            </Badge>
            <h2 className="text-xl font-bold leading-tight">
              Top up to activate the Commissioners Plan
            </h2>
          </div>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          Fund your CTTTRADEZONE wallet dashboard to unlock the Commissioners Plan
          {dailyRoi !== null && durationDays !== null && (
            <> — managed trading over {durationDays} days at the Commissioners tier</>
          )}
          .
        </p>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-background/60 p-3">
            <p className="text-xs text-muted-foreground">Required principal</p>
            <p className="text-lg font-semibold tabular-nums">${usd(required)}</p>
          </div>
          <div className="rounded-lg bg-background/60 p-3">
            <p className="text-xs text-muted-foreground">Available portfolio</p>
            <p className="text-lg font-semibold tabular-nums">${usd(portfolioUsd)}</p>
          </div>
          <div className="rounded-lg bg-background/60 p-3">
            <p className="text-xs text-muted-foreground">Top up needed</p>
            <p className="text-lg font-semibold tabular-nums text-primary">${usd(shortfall)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={onTopUp} size="sm">
            <ArrowUpCircle className="mr-2 h-4 w-4" />
            Top Up Now
          </Button>
          <Button onClick={onActivate} variant="secondary" size="sm">
            <Sparkles className="mr-2 h-4 w-4" />
            Activate Commissioners Plan
          </Button>
        </div>
      </div>
    </Card>
  );
};
