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
import { toast } from "@/hooks/use-toast";
import { ArrowUpRight } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  available: number;
  onWithdraw: (amount: number, address: string) => Promise<{ error?: string; result?: any }>;
}

const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export const LiveWithdrawDialog = ({ open, onOpenChange, available, onWithdraw }: Props) => {
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  const amt = Number(amount) || 0;
  const fee = amt > 0 ? Math.max(Number((amt * 0.01).toFixed(2)), 1) : 0;

  const submit = async () => {
    const addr = address.trim();
    if (amt < 10) {
      toast({ title: "Minimum withdrawal is $10", variant: "destructive" });
      return;
    }
    if (amt > available) {
      toast({ title: "Amount exceeds available balance", variant: "destructive" });
      return;
    }
    if (addr.length < 20 || /^[0-9]+$/.test(addr)) {
      toast({
        title: "Invalid wallet address",
        description: "Enter a valid BTC, ETH or TRC-20 address.",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    const { error, result } = await onWithdraw(amt, addr);
    setBusy(false);
    if (error) {
      toast({ title: "Withdrawal failed", description: error, variant: "destructive" });
      return;
    }
    toast({
      title: "Withdrawal submitted",
      description: `${fmtUsd(amt)} requested · fee ${fmtUsd(Number(result?.fee ?? fee))} · net ${fmtUsd(
        Number(result?.net ?? amt - fee),
      )}`,
    });
    setAmount("");
    setAddress("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-primary" />
            Withdraw to external wallet
          </DialogTitle>
          <DialogDescription>
            Send your available live trading balance to any external BTC, ETH or USDT (TRC-20)
            address. Requests are reviewed before payout.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="live-wd-amount">Amount (USD)</Label>
            <Input
              id="live-wd-amount"
              type="number"
              min="10"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Available {fmtUsd(available)}</span>
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => setAmount(available.toFixed(2))}
              >
                Max
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="live-wd-address">Destination wallet address</Label>
            <Input
              id="live-wd-address"
              value={address}
              maxLength={120}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="bc1… / 0x… / T…"
            />
          </div>
          <div className="rounded-lg border border-border p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network fee (1%, min $1)</span>
              <span className="font-mono">{fmtUsd(fee)}</span>
            </div>
            <div className="mt-1 flex justify-between font-medium">
              <span>You receive</span>
              <span className="font-mono">{fmtUsd(Math.max(0, amt - fee))}</span>
            </div>
          </div>
          <Button className="w-full" onClick={submit} disabled={busy}>
            {busy ? "Submitting..." : "Request withdrawal"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LiveWithdrawDialog;
