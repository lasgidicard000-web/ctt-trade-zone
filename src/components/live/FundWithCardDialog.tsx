import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { CreditCard, Lock } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  last4: string;
  network: string;
  perTxLimit: number;
  remainingToday: number;
  hasPin: boolean;
  verifyPin: (pin: string) => Promise<{ error?: string }>;
  onFund: (amount: number) => Promise<{ error?: string; result?: any }>;
}

const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export const FundWithCardDialog = ({
  open,
  onOpenChange,
  last4,
  network,
  perTxLimit,
  remainingToday,
  hasPin,
  verifyPin,
  onFund,
}: Props) => {
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt < 10) {
      toast({ title: "Minimum funding is $10", variant: "destructive" });
      return;
    }
    if (hasPin && pin.length < 4) {
      toast({ title: "Enter your card PIN", variant: "destructive" });
      return;
    }
    setBusy(true);
    if (hasPin) {
      const { error } = await verifyPin(pin);
      if (error) {
        setBusy(false);
        toast({ title: "Card authorization failed", description: error, variant: "destructive" });
        return;
      }
    }
    const { error, result } = await onFund(amt);
    setBusy(false);
    if (error) {
      toast({ title: "Funding failed", description: error, variant: "destructive" });
      return;
    }
    if (result?.declined) {
      toast({ title: "Card declined", description: result.reason, variant: "destructive" });
      return;
    }
    toast({
      title: "Live balance funded",
      description: `${fmtUsd(amt)} charged to card ••••${last4} (${Number(result?.btc ?? 0).toFixed(8)} BTC)`,
    });
    setAmount("");
    setPin("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Fund live trading with your card
          </DialogTitle>
          <DialogDescription>
            The CTT spend card is the only deposit method for the live terminal. The amount is charged
            to card ••••{last4} at the live BTC rate.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
            <span className="font-medium">
              {network.toUpperCase()} ••••{last4}
            </span>
            <Badge variant="secondary">Only deposit route</Badge>
          </div>
          <div className="space-y-2">
            <Label htmlFor="live-fund-amount">Amount (USD)</Label>
            <Input
              id="live-fund-amount"
              type="number"
              min="10"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              Min $10 · per-transaction limit {fmtUsd(perTxLimit)} · remaining today{" "}
              {fmtUsd(Math.max(0, remainingToday))}
            </p>
          </div>
          {hasPin && (
            <div className="space-y-2">
              <Label htmlFor="live-fund-pin" className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                Card PIN
              </Label>
              <Input
                id="live-fund-pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
              />
            </div>
          )}
          <Button className="w-full" onClick={submit} disabled={busy}>
            {busy ? "Authorizing..." : "Charge card & fund balance"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FundWithCardDialog;
