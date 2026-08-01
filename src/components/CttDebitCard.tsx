import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Wifi, Clock } from "lucide-react";
import logoAsset from "@/assets/ctttradezone-logo.png.asset.json";

interface Props {
  userId: string;
  portfolioUsd: number;
}

const usd = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const CttDebitCard = ({ userId, portfolioUsd }: Props) => {
  const [holder, setHolder] = useState<string>("CTT MEMBER");
  const [planStartedAt, setPlanStartedAt] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const load = async () => {
      const [{ data: profile }, { data: inv }] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("user_id", userId).maybeSingle(),
        supabase
          .from("user_investments")
          .select("started_at")
          .eq("user_id", userId)
          .eq("status", "active")
          .ilike("plan_name", "%commissioner%")
          .order("started_at", { ascending: false })
          .limit(1),
      ]);
      if (profile?.display_name) setHolder(profile.display_name.toUpperCase());
      setPlanStartedAt(inv?.[0]?.started_at ?? null);
    };
    load();
  }, [userId]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const activated = Boolean(planStartedAt);
  let countdown = "";
  if (planStartedAt) {
    const endMs = new Date(planStartedAt).getTime() + 24 * 60 * 60 * 1000;
    const remaining = Math.max(0, endMs - now);
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    countdown = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  return (
    <Card className="mb-6 border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <CreditCard className="h-4 w-4 text-primary" />
          My CTT Debit Card
        </p>
        <Badge
          variant="secondary"
          className={activated ? "bg-primary/15 text-primary" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"}
        >
          {activated ? "PENDING — ACTIVATING" : "AWAITING ACTIVATION"}
        </Badge>
      </div>

      <div className="relative mx-auto aspect-[1.586/1] w-full max-w-md overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/70 to-background p-5 shadow-lg">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-foreground/10" />
        <div className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-primary-foreground/5" />

        <div className="relative flex h-full flex-col justify-between text-primary-foreground">
          <div className="flex items-start justify-between">
            <img src={logoAsset.url} alt="CTT Trade Zone" className="h-9 w-9 rounded-md object-contain" />
            <Wifi className="h-5 w-5 rotate-90 opacity-80" />
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest opacity-70">Portfolio balance</p>
            <p className="text-2xl font-bold tabular-nums">${usd(portfolioUsd)}</p>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <div className="mb-2 h-6 w-9 rounded bg-primary-foreground/30" />
              <p className="font-mono text-sm tracking-[0.2em] opacity-90">•••• •••• •••• 0000</p>
              <p className="mt-1 text-xs uppercase tracking-wider opacity-80">{holder}</p>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80">CTT Trade Zone</p>
          </div>
        </div>
      </div>

      <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
        <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {activated ? (
          <span>
            Card issuance in progress — your CTT debit card is activated within 24 hours.
            Time remaining: <span className="font-semibold tabular-nums">{countdown}</span>
          </span>
        ) : (
          <span>
            Your CTT debit card is issued and activated within 24 hours once the Commissioners Plan
            is activated on your wallet dashboard.
          </span>
        )}
      </p>
    </Card>
  );
};
