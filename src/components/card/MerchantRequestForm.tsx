import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { MERCHANTS, usd, type MerchantOption } from "./merchants";
import type { VirtualCard } from "@/hooks/useVirtualCard";

interface Props {
  card: VirtualCard | null;
  pendingHeld: number;
  blockedReason: string | null;
  onSubmit: (
    merchant: string,
    category: string,
    amountUsd: number,
    reference?: string
  ) => Promise<{ error?: string; result?: any }>;
  compact?: boolean;
}

/** Merchant grid + submit dialog shared by the merchant payments page, card tile and wallet row. */
export const MerchantRequestForm = ({
  card,
  pendingHeld,
  blockedReason,
  onSubmit,
  compact = false,
}: Props) => {
  const [active, setActive] = useState<MerchantOption | null>(null);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);

  const remainingToday = card
    ? Math.max(0, card.daily_limit - card.spent_today - pendingHeld)
    : 0;
  const spendable = !blockedReason && !!card;

  const open = (m: MerchantOption) => {
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
        description: `Your card balance is ${usd(card.balance_usd)}. Convert BTC to your card or top it up with USDT (TRC20).`,
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    const { error } = await onSubmit(active.name, active.category, amt, reference);
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

  return (
    <>
      <div className={`grid gap-2 ${compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 gap-3 sm:grid-cols-4"}`}>
        {MERCHANTS.map((m) => (
          <button
            key={m.name}
            type="button"
            onClick={() => open(m)}
            disabled={!spendable}
            className={`group rounded-xl border border-border bg-muted/30 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50 ${
              compact ? "p-3" : "p-4"
            }`}
          >
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.category}</p>
            <p className={`mt-0.5 font-semibold group-hover:text-primary ${compact ? "text-sm" : ""}`}>
              {m.name}
            </p>
            {!compact && <p className="text-[11px] text-muted-foreground">{m.hint}</p>}
          </button>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && !busy && setActive(null)}>
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
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Order number or account email"
                maxLength={120}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

/** Shared reason a member cannot pay merchants right now, or null when they can. */
export const merchantBlockedReason = (card: VirtualCard | null): string | null => {
  if (!card) return "You don't have a CTT spend card yet.";
  if (!card.activated_at)
    return `Your card needs its activation deposit of ${usd(
      card.activation_required_usd
    )} before you can pay merchants.`;
  if (card.status === "frozen")
    return "Your card is frozen. Unfreeze it from the card section to pay merchants.";
  if (card.status !== "active") return "Your card is not active.";
  return null;
};
