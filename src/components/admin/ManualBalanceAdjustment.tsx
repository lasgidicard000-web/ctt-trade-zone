import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Wallet } from "lucide-react";

const COINS = ["USDT", "BTC", "ETH", "CCT", "USDC", "BNB", "SOL"];

export const ManualBalanceAdjustment = ({ onDone }: { onDone?: () => void }) => {
  const [userId, setUserId] = useState("");
  const [coin, setCoin] = useState("USDT");
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!userId.trim() || !amt || amt <= 0 || !reason.trim()) {
      toast.error("Fill user id, positive amount, and reason");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-transactions", {
        body: {
          action: "adjust-balance",
          payload: {
            user_id: userId.trim(),
            coin_symbol: coin,
            direction,
            amount: amt,
            reason: reason.trim(),
          },
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Balance ${direction}ed. New balance: ${(data as any)?.data?.newBalance}`);
      setUserId(""); setAmount(""); setReason("");
      onDone?.();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wallet className="h-5 w-5" /> Manual Balance Adjustment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>User ID</Label>
            <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="uuid" />
          </div>
          <div className="space-y-2">
            <Label>Coin</Label>
            <Select value={coin} onValueChange={setCoin}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COINS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Direction</Label>
            <Select value={direction} onValueChange={(v) => setDirection(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="credit">Credit (add)</SelectItem>
                <SelectItem value="debit">Debit (subtract)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input type="number" step="0.00000001" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Reason (required, audited)</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
        </div>
        <Button onClick={submit} disabled={busy} className="w-full">
          {busy ? "Applying..." : `Apply ${direction}`}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ManualBalanceAdjustment;
