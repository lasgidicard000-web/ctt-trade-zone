import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CreditCard, Wifi, Clock, Eye, EyeOff, Copy, ChevronDown, Receipt } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import logoAsset from "@/assets/ctttradezone-logo.png.asset.json";
import { useVirtualCard } from "@/hooks/useVirtualCard";
import { CardControls } from "@/components/card/CardControls";
import { CardSpendDialog } from "@/components/card/CardSpendDialog";
import { CardTransactionsList } from "@/components/card/CardTransactionsList";

interface Props {
  userId: string;
  portfolioUsd: number;
}

const usd = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const groupPan = (pan: string) => pan.replace(/(.{4})/g, "$1 ").trim();

export const CttDebitCard = ({ userId, portfolioUsd }: Props) => {
  const { card, transactions, loading, setStatus, setPin, spend, reveal } = useVirtualCard(userId);
  const [holder, setHolder] = useState<string>("CTT MEMBER");
  const [planStartedAt, setPlanStartedAt] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [details, setDetails] = useState<{ card_number: string; cvv: string } | null>(null);
  const [secure, setSecure] = useState<{ card_number: string; cvv: string } | null>(null);
  const [spendOpen, setSpendOpen] = useState(false);


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

  // auto re-mask revealed details after 30s
  useEffect(() => {
    if (!details) return;
    const t = setTimeout(() => setDetails(null), 30000);
    return () => clearTimeout(t);
  }, [details]);

  const planActive = Boolean(planStartedAt);
  const isActive = card?.status === "active";
  const isFrozen = card?.status === "frozen";

  let countdown = "";
  if (planStartedAt) {
    const endMs = new Date(planStartedAt).getTime() + 24 * 60 * 60 * 1000;
    const remaining = Math.max(0, endMs - now);
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    countdown = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  const statusBadge = () => {
    if (isActive)
      return (
        <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          ACTIVE
        </Badge>
      );
    if (isFrozen)
      return (
        <Badge variant="secondary" className="bg-sky-500/15 text-sky-600 dark:text-sky-400">
          FROZEN
        </Badge>
      );
    if (card?.status === "terminated")
      return (
        <Badge variant="secondary" className="bg-destructive/15 text-destructive">
          TERMINATED
        </Badge>
      );
    return (
      <Badge variant="secondary" className={planActive ? "bg-primary/15 text-primary" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"}>
        {planActive ? "PENDING — ACTIVATING" : "AWAITING ACTIVATION"}
      </Badge>
    );
  };

  const onReveal = async () => {
    if (details) {
      setDetails(null);
      return;
    }
    const { details: d, error } = await reveal();
    if (error) return toast({ title: "Unable to reveal card", description: error, variant: "destructive" });
    setDetails(d);
  };

  const copyPan = async () => {
    const { details: d, error } = await reveal();
    if (error || !d) return toast({ title: "Unable to copy", description: error, variant: "destructive" });
    await navigator.clipboard.writeText(d.card_number);
    toast({ title: "Card number copied" });
  };

  const pan = details ? groupPan(details.card_number) : `•••• •••• •••• ${card?.last4 ?? "0000"}`;
  const expiry = card ? `${String(card.expiry_month).padStart(2, "0")}/${String(card.expiry_year).slice(-2)}` : "••/••";

  return (
    <Card className="mb-6 border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <CreditCard className="h-4 w-4 text-primary" />
          My CTT Debit Card
        </p>
        {statusBadge()}
      </div>

      <div
        className={`relative mx-auto aspect-[1.586/1] w-full max-w-md overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/70 to-background p-5 shadow-lg transition-opacity ${
          isFrozen || card?.status === "terminated" ? "opacity-60" : ""
        }`}
      >
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-foreground/10" />
        <div className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-primary-foreground/5" />

        <div className="relative flex h-full flex-col justify-between text-primary-foreground">
          <div className="flex items-start justify-between">
            <img src={logoAsset.url} alt="CTT Trade Zone" className="h-9 w-9 rounded-md object-contain" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                {card?.network ?? "CTT Virtual Mastercard"}
              </span>
              <Wifi className="h-5 w-5 rotate-90 opacity-80" />
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest opacity-70">Spendable balance</p>
            <p className="text-2xl font-bold tabular-nums">${usd(portfolioUsd)}</p>
          </div>

          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 h-6 w-9 rounded bg-primary-foreground/30" />
              <p className="font-mono text-sm tracking-[0.15em] opacity-90">{pan}</p>
              <div className="mt-1 flex items-center gap-3">
                <p className="text-xs uppercase tracking-wider opacity-80">{holder}</p>
                <p className="font-mono text-xs opacity-80">EXP {expiry}</p>
                {details && <p className="font-mono text-xs opacity-80">CVV {details.cvv}</p>}
              </div>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80">CTT</p>
          </div>
        </div>
      </div>

      {card && card.status !== "terminated" ? (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={onReveal}>
              {details ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
              {details ? "Hide details" : "Reveal details"}
            </Button>
            <Button size="sm" variant="outline" onClick={copyPan}>
              <Copy className="mr-2 h-4 w-4" /> Copy number
            </Button>
          </div>

          <CardControls
            card={card}
            onSetStatus={setStatus}
            onSetPin={setPin}
            onOpenSpend={() => setSpendOpen(true)}
          />

          <Collapsible className="mt-4">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between px-0">
                <span className="flex items-center gap-2 text-sm">
                  <Receipt className="h-4 w-4 text-primary" /> Card transactions ({transactions.length})
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardTransactionsList transactions={transactions} />
            </CollapsibleContent>
          </Collapsible>

          <CardSpendDialog
            open={spendOpen}
            onOpenChange={setSpendOpen}
            perTxLimit={card.per_tx_limit}
            remainingToday={card.daily_limit - card.spent_today}
            onSpend={spend}
          />
        </>
      ) : (
        <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {loading ? (
            <span>Checking your card status…</span>
          ) : card?.status === "terminated" ? (
            <span>This card was terminated. A new card can be issued while your plan stays active.</span>
          ) : planActive ? (
            <span>
              Card issuance in progress — your CTT debit card is activated within 24 hours. Time
              remaining: <span className="font-semibold tabular-nums">{countdown}</span>
            </span>
          ) : (
            <span>
              Your CTT debit card is issued and activated within 24 hours once the Commissioners Plan
              is activated on your wallet dashboard.
            </span>
          )}
        </p>
      )}
    </Card>
  );
};
