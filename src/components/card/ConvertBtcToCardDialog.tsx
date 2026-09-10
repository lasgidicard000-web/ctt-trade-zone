import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ArrowRightLeft, Loader2, Lock } from "lucide-react";
import { usd } from "./merchants";
import type { VirtualCard } from "@/hooks/useVirtualCard";

interface Investment {
  id: string;
  plan_name: string;
  amount: number;
}

interface Props {
  userId?: string | null;
  card: VirtualCard | null;
  onConvert: (
    amountUsd: number,
    investmentId?: string
  ) => Promise<{ error?: string; result?: any }>;
  className?: string;
  size?: "sm" | "default";
}

const BTC_LABEL = "Convert your BTC from your plans to USDT and send to your card for merchant payment";

export const ConvertBtcToCardDialog = ({
  userId,
  card,
  onConvert,
  className,
  size = "default",
}: Props) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rate, setRate] = useState(0);
  const [btcBalance, setBtcBalance] = useState(0);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [source, setSource] = useState<string>("balance");
  const [amount, setAmount] = useState("");

  const active = card?.status === "active" && Boolean(card?.activated_at);

  const load = useCallback(async () => {
    if (!userId) return;
    const [{ data: price }, { data: bal }, { data: invs }] = await Promise.all([
      supabase.from("coin_prices").select("price").eq("symbol", "BTC").maybeSingle(),
      supabase
        .from("wallet_balances")
        .select("balance")
        .eq("user_id", userId)
        .eq("coin_symbol", "BTC")
        .maybeSingle(),
      supabase
        .from("user_investments")
        .select("id, plan_name, amount")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false }),
    ]);
    setRate(Number(price?.price ?? 0));
    setBtcBalance(Number(bal?.balance ?? 0));
    setInvestments(
      (invs ?? []).map((i: any) => ({ id: i.id, plan_name: i.plan_name, amount: Number(i.amount) }))
    );
  }, [userId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const availableUsd = btcBalance * rate;
  const amt = Number(amount);
  const btcNeeded = rate > 0 && Number.isFinite(amt) && amt > 0 ? amt / rate : 0;

  const submit = async () => {
    if (!Number.isFinite(amt) || amt <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error, result } = await onConvert(amt, source === "balance" ? undefined : source);
    setBusy(false);
    if (error) {
      toast({ title: "Conversion failed", description: error, variant: "destructive" });
      await load();
      return;
    }
    toast({
      title: `${usd(amt)} sent to your card`,
      description: `${Number(result?.btc ?? btcNeeded).toFixed(8)} BTC converted to USDT. Card balance ${usd(
        Number(result?.cardBalance ?? 0)
      )}.`,
    });
    setOpen(false);
    setAmount("");
  };

  if (!active) {
    return (
      <div className={className}>
        <Button size={size} variant="outline" disabled className="w-full justify-start">
          <Lock className="mr-2 h-4 w-4" />
          Available when card becomes active
        </Button>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Complete the {usd(card?.activation_required_usd ?? 1000)} USDT (TRC20) activation deposit to
          convert plan BTC into card spending balance.
        </p>
      </div>
    );
  }

  return (
    <>
      <Button size={size} className={className} onClick={() => setOpen(true)}>
        <ArrowRightLeft className="mr-2 h-4 w-4" />
        <span className="text-left">{BTC_LABEL}</span>
      </Button>

      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convert BTC to card USDT</DialogTitle>
            <DialogDescription>
              Move value from your plans or portfolio BTC onto your CTT spend card ••{card?.last4}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Source</Label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setSource("balance")}
                  className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                    source === "balance" ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <span className="font-medium">Available BTC balance</span>
                  <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                    {btcBalance.toFixed(8)} BTC · {usd(availableUsd)}
                  </span>
                </button>
                {investments.map((inv) => (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => setSource(inv.id)}
                    className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                      source === inv.id ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <span className="font-medium">{inv.plan_name}</span>
                    <Badge variant="outline" className="ml-2 text-[10px]">
                      cash out first
                    </Badge>
                    <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                      capital {usd(inv.amount)}
                    </span>
                  </button>
                ))}
              </div>
              {source !== "balance" && (
                <p className="text-xs text-amber-500">
                  This plan is cashed out first (capital + profit in BTC), then the amount below is
                  converted to your card. The plan stops earning daily ROI.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="convert-amount">Amount to send to card (USD)</Label>
              <Input
                id="convert-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground tabular-nums">
                BTC rate {usd(rate)} · costs {btcNeeded.toFixed(8)} BTC
                {source === "balance" ? ` · available ${usd(availableUsd)}` : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                {[100, 250, 500, 1000].map((v) => (
                  <Button key={v} variant="outline" size="sm" onClick={() => setAmount(String(v))}>
                    ${v}
                  </Button>
                ))}
                {source === "balance" && availableUsd > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(String(Math.floor(availableUsd * 100) / 100))}
                  >
                    Max
                  </Button>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send to card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
