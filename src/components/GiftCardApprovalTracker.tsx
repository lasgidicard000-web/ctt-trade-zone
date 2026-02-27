import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Clock, Gift } from "lucide-react";

interface Redemption {
  id: string;
  gift_card_type: string | null;
  gift_card_currency: string | null;
  crypto_symbol: string;
  amount: number | null;
  status: string;
  created_at: string;
}

interface GiftCardApprovalTrackerProps {
  userId: string;
}

const TOTAL_SEGMENTS = 4;
const TARGET_AMOUNT = 1000;

export const GiftCardApprovalTracker = ({ userId }: GiftCardApprovalTrackerProps) => {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRedemptions = async () => {
      const { data } = await supabase
        .from("redemptions")
        .select("id, gift_card_type, gift_card_currency, crypto_symbol, amount, status, created_at")
        .eq("user_id", userId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      setRedemptions(data || []);
      setLoading(false);
    };

    fetchRedemptions();
  }, [userId]);

  if (loading || redemptions.length === 0) return null;

  const redemption = redemptions[0];
  const amount = redemption.amount || 0;
  const approvedSegments = 1;
  const approvedAmount = amount / TOTAL_SEGMENTS;
  const progressPercent = (approvedSegments / TOTAL_SEGMENTS) * 100;

  const giftCardLabel = redemption.gift_card_type === "itunes" ? "Apple" : (redemption.gift_card_type || "Gift Card");
  const currency = redemption.gift_card_currency || "USD";

  return (
    <Card className="mb-6 border-border bg-card overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gift className="h-5 w-5 text-primary" />
            Gift Card Redemption Status
          </CardTitle>
          <Badge className="bg-primary/20 text-primary hover:bg-primary/30">
            {approvedSegments}/{TOTAL_SEGMENTS} Approved
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Card Details */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {giftCardLabel} Gift Card &middot; ${amount.toLocaleString()} {currency}
          </span>
          <span className="text-muted-foreground">
            Target: ${TARGET_AMOUNT.toLocaleString()} {currency}
          </span>
        </div>

        {/* Geometric 2x2 Grid */}
        <div className="flex items-center gap-6">
          <div className="grid grid-cols-2 gap-2 shrink-0">
            {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => {
              const isApproved = i < approvedSegments;
              return (
                <div
                  key={i}
                  className={`relative flex h-16 w-16 items-center justify-center rounded-lg transition-all duration-500 ${
                    isApproved
                      ? "bg-accent/20 border-2 border-accent shadow-[0_0_12px_hsl(var(--accent)/0.3)]"
                      : "border-2 border-dashed border-muted-foreground/30"
                  }`}
                >
                  {isApproved ? (
                    <CheckCircle className="h-7 w-7 text-accent animate-in zoom-in duration-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground/40" />
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 rounded-tl-md rounded-br-lg bg-card px-1 text-[10px] text-muted-foreground">
                    {i + 1}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress Ring */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="relative h-24 w-24">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle
                  cx="50" cy="50" r="42"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="8"
                />
                <circle
                  cx="50" cy="50" r="42"
                  fill="none"
                  stroke="hsl(var(--accent))"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${progressPercent * 2.64} ${264 - progressPercent * 2.64}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold">{progressPercent.toFixed(0)}%</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              ${approvedAmount.toLocaleString()} {currency} approved / ${amount.toLocaleString()} {currency} total
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <Progress value={progressPercent} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Approved: ${approvedAmount.toLocaleString()} {currency}</span>
            <span>Remaining: ${(amount - approvedAmount).toLocaleString()} {currency}</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground/70">
          Converting to {redemption.crypto_symbol.toUpperCase()} &middot; Approval progresses in quarter increments
        </p>
      </CardContent>
    </Card>
  );
};
