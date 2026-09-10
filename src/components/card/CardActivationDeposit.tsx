import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { Copy, Check, AlertTriangle, ShieldCheck, MessageCircle, Loader2 } from "lucide-react";

const FALLBACK_ADDRESS = "TFyYSnWZTUyEWJyqWHW4fE6FSwJhtYVq9L";

const usd = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  holder: string;
  depositAddress?: string | null;
  creditedUsd: number;
  requiredUsd: number;
  activatedAt?: string | null;
  pendingUsd?: number;
  onRequestFunding: (amountUsd: number, txHash?: string) => Promise<{ error?: string }>;
}

export const CardActivationDeposit = ({
  holder,
  depositAddress,
  creditedUsd,
  requiredUsd,
  activatedAt,
  pendingUsd = 0,
  onRequestFunding,
}: Props) => {
  const address = depositAddress || FALLBACK_ADDRESS;
  const [qr, setQr] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(address, { width: 220, margin: 1 }).then(setQr).catch(() => setQr(""));
  }, [address]);

  const remaining = Math.max(0, requiredUsd - creditedUsd);
  const pct = requiredUsd > 0 ? Math.min(100, (creditedUsd / requiredUsd) * 100) : 100;
  const satisfied = Boolean(activatedAt) || creditedUsd >= requiredUsd;

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 4000);
      toast({ title: "Deposit address copied", description: "USDT TRC20 (Tron) address copied." });
    } catch {
      toast({ title: "Copy failed", description: "Clipboard is unavailable", variant: "destructive" });
    }
  };

  const confirmSent = async () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast({ title: "Enter the amount you sent", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await onRequestFunding(amt, txHash);
    setBusy(false);
    if (error) {
      toast({ title: "Could not record your deposit", description: error, variant: "destructive" });
      return;
    }
    const summary = [
      "CTT SPEND CARD FUNDING / ACTIVATION DEPOSIT",
      `Card holder: ${holder}`,
      `Amount sent: $${usd(amt)} worth of USDT`,
      "Network: TRC20 (Tron)",
      `Address: ${address}`,
      txHash.trim() ? `Transaction hash: ${txHash.trim()}` : "Transaction hash: not provided",
      "Status: submitted — awaiting confirmation",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(summary);
    } catch {
      /* clipboard unavailable — still open chat */
    }
    setAmount("");
    setTxHash("");
    toast({
      title: "Deposit submitted",
      description: "Details copied — paste them into the live chat so support can confirm it.",
    });
    const tawk = (window as any).Tawk_API;
    if (tawk?.maximize) tawk.maximize();
  };

  if (satisfied) {
    return (
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div className="text-xs">
          <p className="font-semibold text-emerald-700 dark:text-emerald-400">
            Card activated — ready to spend
          </p>
          <p className="mt-0.5 text-muted-foreground">
            ${usd(creditedUsd)} credited to this card. Add more funds any time using the Tron
            (TRC20) address below.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="break-all font-mono text-[11px] font-semibold">{address}</span>
            <Button size="sm" variant="outline" onClick={copyAddress}>
              {copied ? (
                <Check className="mr-2 h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copied ? "Copied!" : "Copy address"}
            </Button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="fund-amount-more" className="text-[11px]">
                Amount sent (USD)
              </Label>
              <Input
                id="fund-amount-more"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fund-hash-more" className="text-[11px]">
                Transaction hash (optional)
              </Label>
              <Input
                id="fund-hash-more"
                value={txHash}
                maxLength={128}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="Tron TXID"
              />
            </div>
          </div>
          <Button size="sm" className="mt-2" onClick={confirmSent} disabled={busy}>
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="mr-2 h-4 w-4" />
            )}
            I have sent the deposit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold">Activate your CTT spend card</p>
        <Badge variant="secondary" className="bg-amber-500/15 text-amber-600 dark:text-amber-400">
          Deposit required
        </Badge>
      </div>

      <p className="text-sm font-semibold">
        Deposit ${usd(requiredUsd)} worth of USDT (TRC20)
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        This deposit becomes your card balance and unlocks spending. ${usd(remaining)} still needed.
      </p>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        {qr && (
          <img
            src={qr}
            alt="USDT TRC20 deposit address QR code"
            className="h-28 w-28 shrink-0 self-center rounded-lg border border-border bg-background p-1"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            USDT · TRC20 (Tron) deposit address
          </p>
          <p className="mt-1 break-all font-mono text-xs font-semibold">{address}</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={copyAddress}>
            {copied ? (
              <Check className="mr-2 h-4 w-4 text-emerald-500" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            {copied ? "Copied!" : "Copy address"}
          </Button>
        </div>
      </div>

      <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs font-medium text-amber-600 dark:text-amber-400">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Send only USDT on the TRC20 (Tron) network to this address. Sending on any other network
        results in permanent loss.
      </p>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Credited to your card</span>
          <span className="font-semibold tabular-nums">
            ${usd(creditedUsd)} / ${usd(requiredUsd)}
          </span>
        </div>
        <Progress value={pct} className="h-2" />
        {pendingUsd > 0 && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            ${usd(pendingUsd)} awaiting confirmation
          </p>
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="fund-amount" className="text-xs">
            Amount sent (USD)
          </Label>
          <Input
            id="fund-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000.00"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="fund-hash" className="text-xs">
            Transaction hash (optional)
          </Label>
          <Input
            id="fund-hash"
            value={txHash}
            maxLength={128}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="Tron TXID"
          />
        </div>
      </div>

      <Button size="sm" className="mt-3 w-full" onClick={confirmSent} disabled={busy}>
        {busy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <MessageCircle className="mr-2 h-4 w-4" />
        )}
        I have sent the deposit
      </Button>
    </div>
  );
};

export default CardActivationDeposit;
