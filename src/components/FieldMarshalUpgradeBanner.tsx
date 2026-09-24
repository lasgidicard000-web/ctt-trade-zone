import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpCircle, CheckCircle2, Sparkles } from "lucide-react";
import { planBadgeUrl, planBadgeAlt } from "@/lib/planBadges";

interface Props {
  userId: string;
  portfolioUsd: number;
  onTopUp: () => void;
  onUpgrade: () => void;
}

const usd = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const FieldMarshalUpgradeBanner = ({ userId, portfolioUsd, onTopUp, onUpgrade }: Props) => {
  const [required, setRequired] = useState(10000);
  const [hasPlan, setHasPlan] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: tpl }, { data: inv }] = await Promise.all([
        supabase
          .from("plan_templates")
          .select("principal_min")
          .ilike("name", "%field marshal%")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("user_investments")
          .select("id")
          .eq("user_id", userId)
          .eq("status", "active")
          .or("plan_id.eq.field,plan_name.ilike.%field marshal%")
          .limit(1),
      ]);
      if (tpl) setRequired(Number(tpl.principal_min));
      setHasPlan((inv?.length ?? 0) > 0);
    })();
  }, [userId]);

  if (hasPlan === null) return null;
  const badge = planBadgeUrl("field");

  if (hasPlan) {
    return (
      <Card className="mb-6 border-accent/40 bg-accent/5 p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-accent" />
          <p className="font-semibold">Field Marshal Plan active</p>
        </div>
      </Card>
    );
  }

  const shortfall = Math.max(0, required - portfolioUsd);

  return (
    <Card className="mb-6 overflow-hidden border-primary/40 bg-gradient-to-br from-destructive/15 via-primary/5 to-accent/10 p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {badge && (
          <img src={badge} alt={planBadgeAlt("Field Marshal")} width={1024} height={1024} loading="lazy" className="h-14 w-14 object-contain" />
        )}
        <div>
          <Badge variant="secondary" className="mb-1 text-xs">Top tier</Badge>
          <h2 className="text-xl font-bold leading-tight">Top up to upgrade to Field Marshal</h2>
        </div>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Our highest plan: lowest withdrawal fee, highest daily cap, priority support. Returns are not
        guaranteed, and every payout is approved by an admin.
      </p>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-background/60 p-3">
          <p className="text-xs text-muted-foreground">Minimum deposit</p>
          <p className="text-lg font-semibold tabular-nums">${usd(required)}</p>
        </div>
        <div className="rounded-lg bg-background/60 p-3">
          <p className="text-xs text-muted-foreground">Available balance</p>
          <p className="text-lg font-semibold tabular-nums">${usd(portfolioUsd)}</p>
        </div>
        <div className="rounded-lg bg-background/60 p-3">
          <p className="text-xs text-muted-foreground">Top up needed</p>
          <p className="text-lg font-semibold tabular-nums text-primary">${usd(shortfall)}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onTopUp} size="sm">
          <ArrowUpCircle className="mr-2 h-4 w-4" /> Top Up Now
        </Button>
        <Button onClick={onUpgrade} variant="secondary" size="sm">
          <Sparkles className="mr-2 h-4 w-4" /> Upgrade to Field Marshal
        </Button>
      </div>
    </Card>
  );
};
