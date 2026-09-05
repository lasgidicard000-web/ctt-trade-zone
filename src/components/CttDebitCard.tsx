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
import { CreditCard, Wifi, Clock, Eye, EyeOff, Copy, ChevronDown, Receipt, ShieldCheck, Check, History } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import logoAsset from "@/assets/ctttradezone-logo.png.asset.json";
import { useVirtualCard } from "@/hooks/useVirtualCard";
import { CardControls } from "@/components/card/CardControls";
import { CardSpendDialog } from "@/components/card/CardSpendDialog";
import { CardTransactionsList } from "@/components/card/CardTransactionsList";
import { CardRevealDialog } from "@/components/card/CardRevealDialog";
import { CardSecurityLog } from "@/components/card/CardSecurityLog";
import { CardActivationDeposit } from "@/components/card/CardActivationDeposit";


interface Props {
  userId: string;
  portfolioUsd: number;
}

const REVEAL_SECONDS = 60;

type CardField = "pan" | "holder" | "expiry" | "cvv";

const FIELD_LABEL: Record<CardField, string> = {
  pan: "Card number",
  holder: "Card holder",
  expiry: "Expiry date",
  cvv: "CVV",
};

const FIELD_ACTION: Record<CardField, string> = {
  pan: "copy_number",
  holder: "copy_holder",
  expiry: "copy_expiry",
  cvv: "copy_cvv",
};

const usd = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const groupPan = (pan: string) => pan.replace(/(.{4})/g, "$1 ").trim();

export const CttDebitCard = ({ userId, portfolioUsd }: Props) => {
  const { card, transactions, loading, setStatus, setPin, spend, reveal, logEvent } =
    useVirtualCard(userId);
  const [holder, setHolder] = useState<string>("CTT MEMBER");
  const [planStartedAt, setPlanStartedAt] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [details, setDetails] = useState<{ card_number: string; cvv: string } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pendingCopy, setPendingCopy] = useState<CardField | null>(null);
  const [spendOpen, setSpendOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<CardField | null>(null);
  const [expired, setExpired] = useState(false);
  const [logVersion, setLogVersion] = useState(0);

  const track = async (action: string, success = true, detail?: string) => {
    await logEvent(action, success, detail);
    setLogVersion((v) => v + 1);
  };



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

  // auto-hide sensitive details after REVEAL_SECONDS with a live countdown
  useEffect(() => {
    if (!details) return;
    setSecondsLeft(REVEAL_SECONDS);
    setExpired(false);
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setDetails(null);
          setExpired(true);
          track("auto_hide", true, "60s reveal window expired");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [details]);


  // hide details if the card is frozen or terminated while unlocked
  useEffect(() => {
    if (card && card.status !== "active") setDetails(null);
  }, [card?.status]);


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

  const openPinGate = (copy: CardField | null = null) => {
    if (!card?.has_pin) {
      return toast({
        title: "Set a card PIN first",
        description: "Use Manage PIN below to create a 4-digit PIN, then view sensitive details.",
        variant: "destructive",
      });
    }
    setPendingCopy(copy);
    setPinDialogOpen(true);
  };

  const copyField = async (field: CardField, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField((f) => (f === field ? null : f)), 4000);
      toast({ title: `${FIELD_LABEL[field]} copied`, description: "Copied to your clipboard." });
      track(FIELD_ACTION[field], true, `${FIELD_LABEL[field].toLowerCase()} copied to clipboard`);
    } catch {
      toast({ title: "Copy failed", description: "Clipboard is unavailable", variant: "destructive" });
      track(FIELD_ACTION[field], false, "clipboard unavailable");
    }
  };

  const fieldValue = (
    field: CardField,
    d: { card_number: string; cvv: string } | null = details,
  ): string | null => {
    if (field === "holder") return holder;
    if (!d || !card) return null;
    if (field === "pan") return d.card_number;
    if (field === "cvv") return d.cvv;
    return `${String(card.expiry_month).padStart(2, "0")}/${String(card.expiry_year).slice(-2)}`;
  };

  const requestCopy = (field: CardField) => {
    const value = fieldValue(field);
    if (value) return copyField(field, value);
    openPinGate(field);
  };

  const submitPin = async (pin: string) => {
    const res = await reveal(pin);
    if (res.error || !res.details) {
      setLogVersion((v) => v + 1);
      return { ok: false, error: res.error ?? "Could not unlock card details" };
    }
    setDetails(res.details);
    setExpired(false);
    setLogVersion((v) => v + 1);
    if (pendingCopy) {
      const value = fieldValue(pendingCopy, res.details);
      if (value) await copyField(pendingCopy, value);
      setPendingCopy(null);
    }
    return { ok: true };
  };

  const onToggleReveal = () => {
    if (details) {
      setDetails(null);
      setExpired(false);
      track("manual_hide", true, "details hidden by user");
      return;
    }
    openPinGate(null);
  };

  const FieldCopyButton = ({ field }: { field: CardField }) => (
    <button
      type="button"
      onClick={() => requestCopy(field)}
      aria-label={`Copy ${FIELD_LABEL[field].toLowerCase()}`}
      className="rounded p-1 text-primary-foreground/70 transition-colors hover:bg-primary-foreground/15 hover:text-primary-foreground"
    >
      {copiedField === field ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );

  const pan = details ? groupPan(details.card_number) : `•••• •••• •••• ${card?.last4 ?? "0000"}`;
  const expiry =
    details && card
      ? `${String(card.expiry_month).padStart(2, "0")}/${String(card.expiry_year).slice(-2)}`
      : "••/••";
  const cvv = details?.cvv ?? "•••";



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
            <div className="min-w-0 flex-1">
              <div className="mb-2 h-6 w-9 rounded bg-primary-foreground/30" />
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-90">
                  Card number
                </p>
                {!details && (
                  <span className="text-[9px] font-semibold uppercase tracking-wider opacity-70">
                    Unlock to view
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <p className="font-mono text-base font-bold tracking-[0.14em] sm:text-lg">{pan}</p>
                <FieldCopyButton field="pan" />
              </div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-90">
                    Card holder
                  </p>
                  <div className="flex items-center gap-1">
                    <p className="truncate text-sm font-bold uppercase tracking-wider">{holder}</p>
                    <FieldCopyButton field="holder" />
                  </div>
                </div>
                <div className="shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-90">
                    Expires
                  </p>
                  <div className="flex items-center gap-1">
                    <p className="font-mono text-sm font-bold tracking-wider">{expiry}</p>
                    <FieldCopyButton field="expiry" />
                  </div>
                </div>
                <div className="shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-90">CVV</p>
                  <div className="flex items-center gap-1">
                    <p className="font-mono text-sm font-bold tracking-wider">{cvv}</p>
                    <FieldCopyButton field="cvv" />
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs font-bold uppercase tracking-wider opacity-90">CTT</p>
          </div>


        </div>
      </div>

      {card && card.status !== "terminated" ? (
        <>
          <CardActivationDeposit userId={userId} holder={holder} />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" variant={details ? "outline" : "default"} onClick={onToggleReveal}>
              {details ? <EyeOff className="mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              {details ? "Hide now" : expired ? "Unlock again" : "View sensitive details"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => requestCopy("pan")}>
              {copiedField === "pan" ? (
                <Check className="mr-2 h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copiedField === "pan" ? "Copied!" : "Copy number"}
            </Button>
            {details && (
              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground tabular-nums">
                <Eye className="h-3.5 w-3.5" /> Auto-hides in {secondsLeft}s
              </span>
            )}
          </div>

          {details && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-1000 ease-linear"
                style={{ width: `${(secondsLeft / REVEAL_SECONDS) * 100}%` }}
              />
            </div>
          )}

          {copiedField && (
            <p className="mt-2 flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5" /> {FIELD_LABEL[copiedField]} copied to your clipboard
            </p>
          )}

          {expired && !details && (
            <p className="mt-2 flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs font-medium text-amber-600 dark:text-amber-400">
              <Clock className="h-3.5 w-3.5" /> Reveal window ended — sensitive details are hidden. Use
              “Unlock again” to view them.
            </p>
          )}



          <CardRevealDialog
            open={pinDialogOpen}
            onOpenChange={(v) => {
              setPinDialogOpen(v);
              if (!v) setPendingCopy(null);
            }}
            onSubmit={submitPin}
          />


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

          <Collapsible className="mt-1">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between px-0">
                <span className="flex items-center gap-2 text-sm">
                  <History className="h-4 w-4 text-primary" /> Card security activity
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardSecurityLog key={logVersion} cardId={card.id} />
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
        <>
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
          {!loading && <CardActivationDeposit userId={userId} holder={holder} />}
        </>
      )}
    </Card>
  );
};
