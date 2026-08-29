import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useVirtualCard } from "@/hooks/useVirtualCard";
import { Store, ShieldCheck, Loader2 } from "lucide-react";

interface Merchant {
  name: string;
  category: string;
  hint: string;
}

const MERCHANTS: Merchant[] = [
  { name: "Binance", category: "Exchange", hint: "Buy crypto with card" },
  { name: "Bybit", category: "Exchange", hint: "Fund derivatives account" },
  { name: "Amazon", category: "Retail", hint: "Checkout worldwide" },
  { name: "Apple", category: "Digital", hint: "App Store & iCloud" },
  { name: "Netflix", category: "Subscription", hint: "Monthly billing" },
  { name: "Steam", category: "Gaming", hint: "Wallet top-up" },
  { name: "Uber", category: "Travel", hint: "Rides & Uber Eats" },
  { name: "Booking.com", category: "Travel", hint: "Hotels & flights" },
];

const usd = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Merchant tiles that spend directly from the CTT spend card. */
export const SpendCardMerchants = ({ userId }: { userId?: string | null }) => {
  const { card, spend } = useVirtualCard(userId);
  const [active, setActive] = useState<Merchant | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const remainingToday = useMemo(
    () => (card ? Math.max(0, card.daily_limit - card.spent_today) : 0),
    [card]
  );

  const openMerchant = (m: Merchant) => {
    if (!card) {
      toast({
        title: "No active CTT spend card",
        description: "Activate your CTT spend card to pay these merchants.",
        variant: "destructive",
      });
      return;
    }
    setActive(m);
    setAmount("");
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
        description: `Maximum $${usd(card.per_tx_limit)} per purchase.`,
        variant: "destructive",
      });
      return;
    }
    if (amt > remainingToday) {
      toast({
        title: "Daily limit reached",
        description: `Only $${usd(remainingToday)} left today.`,
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    const { error, result } = await spend(active.name, amt);
    setBusy(false);
    if (error) {
      toast({ title: "Purchase failed", description: error, variant: "destructive" });
      return;
    }
    if ((result as any)?.declined) {
      toast({
        title: "Declined",
        description: (result as any).reason,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: `Approved at ${active.name}`,
      description: `$${usd(amt)} charged to card ••${card?.last4} (${Number(
        (result as any)?.btc ?? 0
      ).toFixed(8)} BTC)`,
    });
    setActive(null);
  };

  return (
    <Card className="mb-6 border-border p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-primary/10 p-2">
            <Store className="h-4 w-4 text-primary" />
          </span>
          <div>
            <h3 className="font-semibold">Spend your CTT card</h3>
            <p className="text-xs text-muted-foreground">
              Pay exchanges, retail and subscriptions directly from your BTC balance
            </p>
          </div>
        </div>
        {card ? (
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-500">
            <ShieldCheck className="mr-1 h-3 w-3" /> Card ••{card.last4} · ${usd(remainingToday)} left
            today
          </Badge>
        ) : (
          <Badge variant="outline">No active card</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MERCHANTS.map((m) => (
          <button
            key={m.name}
            type="button"
            onClick={() => openMerchant(m)}
            className="group rounded-xl border border-border bg-muted/30 p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {m.category}
            </p>
            <p className="mt-1 font-semibold group-hover:text-primary">{m.name}</p>
            <p className="text-[11px] text-muted-foreground">{m.hint}</p>
          </button>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Pay {active?.name}</DialogTitle>
            <DialogDescription>
              Charged to your CTT spend card and debited from your BTC balance at the live
              rate.
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
                Per-transaction limit ${usd(card?.per_tx_limit ?? 0)} · remaining today $
                {usd(remainingToday)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[25, 50, 100, 250].map((v) => (
                <Button key={v} variant="outline" size="sm" onClick={() => setAmount(String(v))}>
                  ${v}
                </Button>
              ))}
            </div>
            <Button className="w-full" onClick={submit} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Authorizing...
                </>
              ) : (
                `Authorize payment`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
