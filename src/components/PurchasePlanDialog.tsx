import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

interface PlanTemplate {
  id: string;
  name: string;
  coin: string;
  principal_min: number;
  principal_max: number;
  daily_roi: number;
  duration_days: number;
  is_active: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  btcBalance: number;
  usdtBalance: number;
  btcPrice: number;
  onPurchased?: () => void;
}

const planIdFromName = (name: string) => name.trim().split(/\s+/)[0].toLowerCase();

export const PurchasePlanDialog = ({
  open,
  onOpenChange,
  userId,
  btcBalance,
  usdtBalance,
  btcPrice,
  onPurchased,
}: Props) => {
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [templateId, setTemplateId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [source, setSource] = useState<"USDT" | "BTC">("USDT");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("plan_templates" as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      setTemplates((data as any) ?? []);
    })();
  }, [open]);

  const selected = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId]
  );

  const usdtAvailable = usdtBalance;
  const btcAvailableUsd = btcBalance * btcPrice;
  const availableUsd = source === "USDT" ? usdtAvailable : btcAvailableUsd;

  const amtNum = parseFloat(amount) || 0;

  const submit = async () => {
    if (!selected) {
      toast.error("Choose a plan");
      return;
    }
    if (amtNum < Number(selected.principal_min) || amtNum > Number(selected.principal_max)) {
      toast.error(
        `Principal must be between $${selected.principal_min} and $${selected.principal_max}`
      );
      return;
    }
    if (amtNum > availableUsd) {
      toast.error(`Insufficient ${source} balance`);
      return;
    }

    setSubmitting(true);
    try {
      // Debit wallet
      let newBalance = 0;
      if (source === "USDT") {
        newBalance = usdtBalance - amtNum;
        const { error } = await supabase
          .from("wallet_balances")
          .update({ balance: newBalance })
          .eq("user_id", userId)
          .eq("coin_symbol", "USDT");
        if (error) throw error;
      } else {
        const btcToDebit = amtNum / btcPrice;
        newBalance = btcBalance - btcToDebit;
        const { error } = await supabase
          .from("wallet_balances")
          .update({ balance: newBalance })
          .eq("user_id", userId)
          .eq("coin_symbol", "BTC");
        if (error) throw error;
      }

      const startedAt = new Date();
      const endsAt = new Date(
        startedAt.getTime() + selected.duration_days * 24 * 60 * 60 * 1000
      );

      // Create investment
      const { error: invErr } = await supabase.from("user_investments" as any).insert({
        user_id: userId,
        plan_id: planIdFromName(selected.name),
        plan_name: selected.name,
        amount: amtNum,
        daily_roi: selected.daily_roi,
        duration_days: selected.duration_days,
        status: "active",
        started_at: startedAt.toISOString(),
        ends_at: endsAt.toISOString(),
        template_id: selected.id,
      });
      if (invErr) {
        // Rollback debit
        if (source === "USDT") {
          await supabase
            .from("wallet_balances")
            .update({ balance: usdtBalance })
            .eq("user_id", userId)
            .eq("coin_symbol", "USDT");
        } else {
          await supabase
            .from("wallet_balances")
            .update({ balance: btcBalance })
            .eq("user_id", userId)
            .eq("coin_symbol", "BTC");
        }
        throw invErr;
      }

      // Log transaction
      await supabase.from("transactions").insert({
        user_id: userId,
        type: "plan_purchase",
        from_symbol: source,
        to_symbol: null,
        amount: amtNum,
        status: "completed",
      });

      toast.success(`${selected.name} activated`, {
        description: `Locked $${amtNum.toLocaleString()} for ${selected.duration_days} days`,
      });
      onPurchased?.();
      onOpenChange(false);
      setAmount("");
      setTemplateId("");
    } catch (e: any) {
      toast.error(e.message || "Purchase failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Purchase Investment Plan
          </DialogTitle>
          <DialogDescription>
            Fund a plan directly from your wallet balance. Principal is locked and
            removed from your total portfolio value until the plan matures.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Plan</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} · {(Number(t.daily_roi) * 100).toFixed(2)}%/day ·{" "}
                    {t.duration_days}d
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected && (
              <p className="text-xs text-muted-foreground mt-1">
                Range: ${Number(selected.principal_min).toLocaleString()} – $
                {Number(selected.principal_max).toLocaleString()}
              </p>
            )}
          </div>

          <div>
            <Label>Pay from</Label>
            <Select value={source} onValueChange={(v) => setSource(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USDT">
                  USDT balance (${usdtAvailable.toFixed(2)})
                </SelectItem>
                <SelectItem value="BTC">
                  BTC balance (${btcAvailableUsd.toFixed(2)})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Principal (USD)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={selected ? `Min $${selected.principal_min}` : "0.00"}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Available: ${availableUsd.toFixed(2)}
            </p>
          </div>

          <Button
            onClick={submit}
            disabled={submitting || !selected || amtNum <= 0}
            className="w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Activating...
              </>
            ) : (
              <>Purchase & Activate Plan</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
