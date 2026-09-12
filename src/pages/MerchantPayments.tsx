import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useVirtualCard } from "@/hooks/useVirtualCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  ShieldCheck,
  Store,
  AlertCircle,
} from "lucide-react";

const MERCHANTS = [
  { name: "Binance", category: "Exchange", hint: "Buy crypto with your card" },
  { name: "Bybit", category: "Exchange", hint: "Fund your derivatives account" },
  { name: "Amazon", category: "Retail", hint: "Checkout worldwide" },
  { name: "Apple", category: "Digital", hint: "App Store & iCloud" },
  { name: "Netflix", category: "Subscription", hint: "Monthly billing" },
  { name: "Steam", category: "Gaming", hint: "Wallet top-up" },
  { name: "Uber", category: "Travel", hint: "Rides & Uber Eats" },
  { name: "Booking.com", category: "Travel", hint: "Hotels & flights" },
];

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

const MerchantPayments = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const { card, merchantRequests, requestMerchantPayment, convertBtcToCard, loading } =
    useVirtualCard(userId);

  const [active, setActive] = useState<(typeof MERCHANTS)[number] | null>(null);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
      setChecked(true);
    });
  }, [navigate]);

  const pendingHeld = useMemo(
    () =>
      merchantRequests
        .filter((r) => r.status === "pending")
        .reduce((s, r) => s + r.amount_usd, 0),
    [merchantRequests]
  );

  const activated = Boolean(card?.activated_at);
  const spendable = card?.status === "active" && activated;
  const remainingToday = card ? Math.max(0, card.daily_limit - card.spent_today - pendingHeld) : 0;

  const blockedReason = !card
    ? "You don't have a CTT spend card yet."
    : !activated
    ? `Your card needs its activation deposit of ${usd(card.activation_required_usd)} before you can pay merchants.`
    : card.status === "frozen"
    ? "Your card is frozen. Unfreeze it from the card section to pay merchants."
    : card.status !== "active"
    ? "Your card is not active."
    : null;

  const open = (m: (typeof MERCHANTS)[number]) => {
    if (blockedReason) {
      toast({ title: "Payment unavailable", description: blockedReason, variant: "destructive" });
      return;
    }
    setActive(m);
    setAmount("");
    setReference("");
  };

  const submit = async () => {
    const amt = Number(amount);
    if (!active || !Number.isFinite(amt) || amt <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    if (card && amt > card.per_tx_limit) {
      toast({
        title: "Over per-transaction limit",
        description: `Maximum ${usd(card.per_tx_limit)} per payment.`,
        variant: "destructive",
      });
      return;
    }
    if (amt > remainingToday) {
      toast({
        title: "Daily limit reached",
        description: `Only ${usd(remainingToday)} left today.`,
        variant: "destructive",
      });
      return;
    }
    if (card && amt > card.balance_usd) {
      toast({
        title: "Insufficient card balance",
        description: `Your card balance is ${usd(card.balance_usd)}. Top it up with USDT (TRC20).`,
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    const { error } = await requestMerchantPayment(active.name, active.category, amt, reference);
    setBusy(false);
    if (error) {
      toast({ title: "Payment not submitted", description: error, variant: "destructive" });
      return;
    }
    toast({
      title: `Payment to ${active.name} submitted`,
      description: `${usd(amt)} is held on your card while the payment is processed.`,
    });
    setActive(null);
  };

  const statusBadge = (s: string) =>
    s === "approved" ? (
      <Badge variant="outline" className="border-emerald-500/40 text-emerald-500">Paid</Badge>
    ) : s === "declined" ? (
      <Badge variant="outline" className="border-destructive/40 text-destructive">Declined</Badge>
    ) : (
      <Badge variant="outline" className="border-amber-500/40 text-amber-500">Pending</Badge>
    );

  if (!checked || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/wallet">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Merchant Payments</h1>
            <p className="text-sm text-muted-foreground">
              Pay exchanges, retail and subscriptions with your CTT spend card balance
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-8">
        <Card className="mb-6 border-border p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-primary/10 p-2">
                <CreditCard className="h-5 w-5 text-primary" />
              </span>
              <div>
                <p className="font-semibold">
                  {card ? `CTT spend card •••• ${card.last4}` : "No CTT spend card"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {card
                    ? `${card.network} · ${activated ? "activated" : "activation deposit required"}`
                    : "Activate a card in the card section to pay merchants"}
                </p>
              </div>
            </div>
            {card && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Card balance</p>
                  <p className="font-semibold tabular-nums">{usd(card.balance_usd)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Held pending</p>
                  <p className="font-semibold tabular-nums">{usd(pendingHeld)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Left today</p>
                  <p className="font-semibold tabular-nums">{usd(remainingToday)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Per payment</p>
                  <p className="font-semibold tabular-nums">{usd(card.per_tx_limit)}</p>
                </div>
              </div>
            )}
          </div>
          <div className="mt-4">
            <ConvertBtcToCardDialog userId={userId} card={card} onConvert={convertBtcToCard} />
          </div>
        </Card>

        {blockedReason ? (
          <Alert className="mb-6 border-amber-500/40 bg-amber-500/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{blockedReason}</AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-6 border-emerald-500/40 bg-emerald-500/10">
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription>
              Your card is ready. Payments are held on the card and confirmed once processed.
            </AlertDescription>
          </Alert>
        )}

        <div className="mb-3 flex items-center gap-2">
          <Store className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Choose a merchant</h2>
        </div>
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {MERCHANTS.map((m) => (
            <button
              key={m.name}
              type="button"
              onClick={() => open(m)}
              disabled={!spendable}
              className="group rounded-xl border border-border bg-muted/30 p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{m.category}</p>
              <p className="mt-1 font-semibold group-hover:text-primary">{m.name}</p>
              <p className="text-[11px] text-muted-foreground">{m.hint}</p>
            </button>
          ))}
        </div>

        <Card className="border-border p-6">
          <h2 className="mb-4 font-semibold">Your payment requests</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {merchantRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No merchant payments yet
                    </TableCell>
                  </TableRow>
                ) : (
                  merchantRequests.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">
                        {new Date(r.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {r.merchant}
                        <div className="text-xs text-muted-foreground">{r.category}</div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.reference ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {usd(r.amount_usd)}
                      </TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.admin_note ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Pay {active?.name}</DialogTitle>
            <DialogDescription>
              Charged to your CTT spend card. The amount is held immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="merchant-amount">Amount (USD)</Label>
              <Input
                id="merchant-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Balance {usd(card?.balance_usd ?? 0)} · per payment {usd(card?.per_tx_limit ?? 0)} ·
                left today {usd(remainingToday)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[25, 50, 100, 250].map((v) => (
                <Button key={v} variant="outline" size="sm" onClick={() => setAmount(String(v))}>
                  ${v}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="merchant-ref">Reference (optional)</Label>
              <Input
                id="merchant-ref"
                maxLength={200}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Order number or account email"
              />
            </div>
            <Button className="w-full" onClick={submit} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                </>
              ) : (
                "Submit payment"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantPayments;
