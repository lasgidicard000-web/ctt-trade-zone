import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { Copy, Check, AlertTriangle, ShieldCheck, MessageCircle } from "lucide-react";

const TRC20_ADDRESS = "TFyYSnWZTUyEWJyqWHW4fE6FSwJhtYVq9L";
const REQUIRED_USD = 1000;

const usd = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  userId: string;
  holder: string;
  cardActive?: boolean;
}

export const CardActivationDeposit = ({ userId, holder, cardActive }: Props) => {
  const [usdt, setUsdt] = useState(0);
  const [qr, setQr] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(TRC20_ADDRESS, { width: 220, margin: 1 }).then(setQr).catch(() => setQr(""));
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("wallet_balances")
      .select("balance")
      .eq("user_id", userId)
      .eq("coin_symbol", "USDT")
      .maybeSingle()
      .then(({ data }) => setUsdt(Number(data?.balance ?? 0)));
  }, [userId]);

  const satisfied = usdt >= REQUIRED_USD;
  const pct = Math.min(100, (usdt / REQUIRED_USD) * 100);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(TRC20_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 4000);
      toast({ title: "Deposit address copied", description: "USDT TRC20 (Tron) address copied." });
    } catch {
      toast({ title: "Copy failed", description: "Clipboard is unavailable", variant: "destructive" });
    }
  };

  const confirmSent = async () => {
    const summary = [
      "CTT SPEND CARD ACTIVATION DEPOSIT",
      `Card holder: ${holder}`,
      `Amount: $${usd(REQUIRED_USD)} worth of USDT`,
      "Network: TRC20 (Tron)",
      `Address: ${TRC20_ADDRESS}`,
      "Status: deposit sent — awaiting confirmation",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(summary);
      toast({
        title: "Deposit details copied",
        description: "Paste them into the live chat so support can confirm your activation.",
      });
    } catch {
      /* clipboard unavailable — still open chat */
    }
    const tawk = (window as any).Tawk_API;
    if (tawk?.maximize) tawk.maximize();
  };

  if (satisfied || cardActive) {
    return (
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div className="text-xs">
          <p className="font-semibold text-emerald-700 dark:text-emerald-400">
            Activation deposit received — card ready to spend
          </p>
          <p className="mt-0.5 text-muted-foreground">
            Your $1,000 USDT activation requirement is satisfied. You can use your CTT spend card
            with supported merchants.
          </p>
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
        Deposit ${usd(REQUIRED_USD)} worth of USDT (TRC20)
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        This one-time activation deposit completes verification and unlocks spending on your card.
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
          <p className="mt-1 break-all font-mono text-xs font-semibold">{TRC20_ADDRESS}</p>
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
          <span className="text-muted-foreground">Activation progress</span>
          <span className="font-semibold tabular-nums">
            ${usd(usdt)} / ${usd(REQUIRED_USD)}
          </span>
        </div>
        <Progress value={pct} className="h-2" />
      </div>

      <Button size="sm" className="mt-3 w-full" onClick={confirmSent}>
        <MessageCircle className="mr-2 h-4 w-4" />
        I have sent the deposit
      </Button>
    </div>
  );
};

export default CardActivationDeposit;
