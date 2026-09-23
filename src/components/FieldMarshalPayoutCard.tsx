import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEntitlements } from "@/hooks/useEntitlements";
import { planBadgeAlt, planBadgeUrl } from "@/lib/planBadges";

export const FieldMarshalPayoutCard = ({ userId }: { userId: string }) => {
  const { entitlements } = useEntitlements(userId);
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  if (entitlements.plan_id !== "field") return null;

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 10) return toast.error("Minimum payout is $10");
    if (!address.trim()) return toast.error("Enter your external wallet address");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-withdrawal", {
        body: { action: "request-withdrawal", amount: amt, walletAddress: address.trim(), kind: "field_marshal" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Payout requested", { description: "Pending admin approval." });
      setAmount("");
    } catch (e: any) {
      toast.error(e.message || "Request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mb-6 overflow-hidden border-amber-500/30 bg-gradient-to-br from-red-950/30 to-amber-500/5 p-5">
      <div className="mb-2 flex items-center gap-3">
        <img
          src={planBadgeUrl("field") as string}
          alt={planBadgeAlt("Field Marshal")}
          loading="lazy"
          width={1024}
          height={1024}
          className="h-12 w-12 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
        />
        <div>
          <p className="text-[11px] font-semibold uppercase text-amber-300">Top-tier payout</p>
          <h3 className="font-semibold">Field Marshal payout</h3>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Request a payout from your available USDT balance to your external wallet. Every request is reviewed and approved by an admin. Returns are not guaranteed.
      </p>
      <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto] items-end">
        <div>
          <Label>Amount (USD)</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <Label>External wallet address (BTC / ETH / TRC-20)</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <Button onClick={submit} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request payout"}
        </Button>
      </div>
    </Card>
  );
};
