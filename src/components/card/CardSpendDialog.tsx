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
import { z } from "zod";

const schema = z.object({
  merchant: z.string().trim().min(1, "Merchant is required").max(100, "Merchant name too long"),
  amount: z.number().positive("Amount must be positive").max(1000000, "Amount too large"),
});

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  perTxLimit: number;
  remainingToday: number;
  onSpend: (merchant: string, amount: number) => Promise<{ error?: string; result?: any }>;
}

export const CardSpendDialog = ({ open, onOpenChange, perTxLimit, remainingToday, onSpend }: Props) => {
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const parsed = schema.safeParse({ merchant, amount: Number(amount) });
    if (!parsed.success) {
      toast({
        title: "Check your details",
        description: parsed.error.issues[0].message,
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    const { error, result } = await onSpend(parsed.data.merchant, parsed.data.amount);
    setBusy(false);
    if (error) {
      toast({ title: "Purchase failed", description: error, variant: "destructive" });
      return;
    }
    if (result?.declined) {
      toast({ title: "Declined", description: result.reason, variant: "destructive" });
      return;
    }
    toast({
      title: "Purchase approved",
      description: `$${parsed.data.amount.toLocaleString()} at ${parsed.data.merchant} (${Number(
        result?.btc ?? 0
      ).toFixed(8)} BTC)`,
    });
    setMerchant("");
    setAmount("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Card purchase</DialogTitle>
          <DialogDescription>
            Charged to your CTT card and debited from your BTC balance at the live rate.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="card-merchant">Merchant</Label>
            <Input
              id="card-merchant"
              value={merchant}
              maxLength={100}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="e.g. Amazon"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="card-amount">Amount (USD)</Label>
            <Input
              id="card-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              Per-transaction limit ${perTxLimit.toLocaleString()} · remaining today $
              {Math.max(0, remainingToday).toLocaleString()}
            </p>
          </div>
          <Button className="w-full" onClick={submit} disabled={busy}>
            {busy ? "Processing..." : "Authorize purchase"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
