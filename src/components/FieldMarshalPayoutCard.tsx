import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEntitlements } from "@/hooks/useEntitlements";

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
    <Card className="mb-6 p-5 border-primary/30">
      <div className="flex items-center gap-2 mb-1">
        <Crown className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Field Marshal payout</h3>
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
