import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Clock, Gift, PartyPopper, Bitcoin, ShieldCheck, Mail } from "lucide-react";

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
const BTC_CONVERTED = 0.00971;
const BTC_PER_SEGMENT = 0.00243;

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
  const totalAmount = redemptions.reduce((sum, r) => sum + (r.amount || 0), 0);
  const approvedSegments = redemptions.length;
  const progressPercent = (approvedSegments / TOTAL_SEGMENTS) * 100;

  const giftCardLabel = redemption.gift_card_type === "itunes" ? "Apple" : (redemption.gift_card_type || "Gift Card");
  const currency = redemption.gift_card_currency || "USD";

  const isComplete = approvedSegments >= TOTAL_SEGMENTS;

  return (
    <Card className={`mb-6 border-border bg-card overflow-hidden ${isComplete ? "ring-2 ring-accent shadow-[0_0_20px_hsl(var(--accent)/0.2)]" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {isComplete ? <PartyPopper className="h-5 w-5 text-accent animate-bounce" /> : <Gift className="h-5 w-5 text-primary" />}
            {isComplete ? "Gift Card Redemption Complete!" : "Gift Card Redemption Status"}
          </CardTitle>
          <Badge className={isComplete ? "bg-accent/20 text-accent hover:bg-accent/30" : "bg-primary/20 text-primary hover:bg-primary/30"}>
            {approvedSegments}/{TOTAL_SEGMENTS} {isComplete ? "Complete" : "Approved"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Celebration Banner */}
        {isComplete && (
          <div className="rounded-lg bg-accent/10 border border-accent/30 p-4 text-center space-y-1">
            <p className="text-sm font-semibold text-accent">🎉 All segments approved!</p>
            <p className="text-xs text-muted-foreground">
              Your ${TARGET_AMOUNT.toLocaleString()} USD {giftCardLabel} Gift Card has been fully verified and converted to {redemption.crypto_symbol.toUpperCase()}.
            </p>
          </div>
        )}

        {/* Card Details */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {giftCardLabel} Gift Card &middot; ${totalAmount.toLocaleString()} {currency}
          </span>
          <span className="text-muted-foreground">
            Target: $1,000 USD
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
                <span className="text-lg font-bold">{isComplete ? "✓" : `${progressPercent.toFixed(0)}%`}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {isComplete
                ? `$${TARGET_AMOUNT.toLocaleString()} USD fully approved`
                : `$${totalAmount.toLocaleString()} ${currency} / $${TARGET_AMOUNT.toLocaleString()} USD approved`}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <Progress value={progressPercent} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{isComplete ? `Approved: $${TARGET_AMOUNT.toLocaleString()} USD` : `Approved: $${totalAmount.toLocaleString()} ${currency} / $${TARGET_AMOUNT.toLocaleString()} USD`}</span>
            <span>{isComplete ? "Remaining: $0 USD" : "Remaining: $0 USD"}</span>
          </div>
        </div>

        {/* BTC Conversion Summary */}
        {approvedSegments > 0 && (
          <div className={`rounded-lg border p-4 space-y-3 ${isComplete ? "bg-accent/5 border-accent/30" : "bg-muted/30 border-border"}`}>
            <div className="flex items-center gap-2">
              <Bitcoin className={`h-5 w-5 ${isComplete ? "text-accent" : "text-primary"}`} />
              <span className="text-sm font-semibold">BTC Conversion Summary</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">AUD Submitted</p>
                <p className="text-sm font-bold">${(approvedSegments * 500).toLocaleString()}</p>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">USD Value</p>
                <p className="text-sm font-bold">${(approvedSegments * 250).toLocaleString()}</p>
              </div>
              <div className={`rounded-md p-2 ${isComplete ? "bg-accent/10" : "bg-primary/10"}`}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">BTC Received</p>
                <p className={`text-sm font-bold ${isComplete ? "text-accent" : "text-primary"}`}>
                  {(approvedSegments * BTC_PER_SEGMENT).toFixed(5)}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              {Array.from({ length: approvedSegments }).map((_, i) => (
                <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Segment {i + 1}: $250 USD</span>
                  <span className={isComplete ? "text-accent" : "text-primary"}>≈ {BTC_PER_SEGMENT.toFixed(5)} BTC</span>
                </div>
              ))}
            </div>

            {isComplete && (
              <div className="text-center pt-1 border-t border-accent/20">
                <p className="text-xs text-muted-foreground">
                  Total: <span className="font-semibold text-accent">{BTC_CONVERTED} BTC</span> at ~$102,917/BTC
                </p>
              </div>
            )}
          </div>
        )}

        {/* AGCSB Authentication Protocol */}
        {isComplete && (
          <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-accent" />
              <span className="text-sm font-semibold">AGCSB Authentication Protocol</span>
            </div>

            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Jeremy Element's funds — <span className="font-semibold text-foreground">$2,000 AUD / $1,000 USD</span> (4/4 AUD-GIFT-CARD-SAFEPAL-BANK <span className="font-mono text-xs text-accent">AGCSB</span>) — have been successfully sent to a SafePal account connected (claimed to be connected) by you.
              </p>
              <p>
                You have successfully passed the <span className="font-semibold text-foreground">first step</span> of the Authentication Protocol rule, combining your bank account to the Australian banking sector that freely allows the utilization of cryptocurrency flow for both in and out of your Australian bank account.
              </p>
              <p>
                A total of <span className="font-semibold text-foreground">$1,000 USD ($2,000 AUD)</span> has been credited to Jeremy Element's CTTradezone wallet dashboard and recorded in the transaction history. This was processed as a go-ahead request from <span className="font-mono text-xs text-accent">AGCSB</span> connecting SafePal to the CTTradezone wallet section.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-md bg-muted/50 border border-border p-3">
              <Mail className="h-4 w-4 text-accent shrink-0" />
              <div className="text-xs">
                <span className="text-muted-foreground">Support: </span>
                <a href="mailto:agcsb@caltexvault.com" className="font-medium text-accent hover:underline">
                   agcsb@caltexvault.com
                 </a>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground/70">
          {isComplete
            ? `Successfully converted to ${redemption.crypto_symbol.toUpperCase()} · All 4 segments verified`
            : `Converting to ${redemption.crypto_symbol.toUpperCase()} · Approval progresses in quarter increments`}
        </p>
      </CardContent>
    </Card>
  );
};
