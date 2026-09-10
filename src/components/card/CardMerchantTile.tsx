import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowRight, Store } from "lucide-react";
import { MerchantRequestForm, merchantBlockedReason } from "./MerchantRequestForm";
import { ConvertBtcToCardDialog } from "./ConvertBtcToCardDialog";
import { usd } from "./merchants";
import type { MerchantPaymentRequest, VirtualCard } from "@/hooks/useVirtualCard";

interface Props {
  userId?: string | null;
  card: VirtualCard | null;
  merchantRequests: MerchantPaymentRequest[];
  onRequest: (
    merchant: string,
    category: string,
    amountUsd: number,
    reference?: string
  ) => Promise<{ error?: string; result?: any }>;
  onConvert: (amountUsd: number, investmentId?: string) => Promise<{ error?: string; result?: any }>;
}

const statusBadge = (s: string) =>
  s === "approved" ? (
    <Badge variant="outline" className="border-emerald-500/40 text-emerald-500">Paid</Badge>
  ) : s === "declined" ? (
    <Badge variant="outline" className="border-destructive/40 text-destructive">Declined</Badge>
  ) : (
    <Badge variant="outline" className="border-amber-500/40 text-amber-500">Pending</Badge>
  );

/** Merchant payments tile inside the card section — members submit their own spend requests. */
export const CardMerchantTile = ({
  userId,
  card,
  merchantRequests,
  onRequest,
  onConvert,
}: Props) => {
  const pendingHeld = useMemo(
    () =>
      merchantRequests.filter((r) => r.status === "pending").reduce((s, r) => s + r.amount_usd, 0),
    [merchantRequests]
  );
  const blockedReason = merchantBlockedReason(card);
  const remainingToday = card
    ? Math.max(0, card.daily_limit - card.spent_today - pendingHeld)
    : 0;

  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/20 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-primary/10 p-1.5">
            <Store className="h-4 w-4 text-primary" />
          </span>
          <div>
            <p className="text-sm font-semibold">Merchant payments</p>
            <p className="text-[11px] text-muted-foreground">
              Spend your card at exchanges, retail and subscriptions
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/merchant-payments">
            Full page <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-border/60 p-2">
          <p className="text-[10px] uppercase text-muted-foreground">Balance</p>
          <p className="text-sm font-semibold tabular-nums">{usd(card?.balance_usd ?? 0)}</p>
        </div>
        <div className="rounded-lg border border-border/60 p-2">
          <p className="text-[10px] uppercase text-muted-foreground">Held pending</p>
          <p className="text-sm font-semibold tabular-nums">{usd(pendingHeld)}</p>
        </div>
        <div className="rounded-lg border border-border/60 p-2">
          <p className="text-[10px] uppercase text-muted-foreground">Left today</p>
          <p className="text-sm font-semibold tabular-nums">{usd(remainingToday)}</p>
        </div>
      </div>

      <ConvertBtcToCardDialog
        userId={userId}
        card={card}
        onConvert={onConvert}
        size="sm"
        className="mb-3 w-full whitespace-normal text-left leading-snug h-auto py-2"
      />

      {blockedReason ? (
        <Alert className="border-amber-500/40 bg-amber-500/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{blockedReason}</AlertDescription>
        </Alert>
      ) : (
        <MerchantRequestForm
          card={card}
          pendingHeld={pendingHeld}
          blockedReason={blockedReason}
          onSubmit={onRequest}
          compact
        />
      )}

      {merchantRequests.length > 0 && (
        <div className="mt-3 divide-y divide-border/60">
          {merchantRequests.slice(0, 3).map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.merchant}</p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                  {r.reference ? ` · ${r.reference}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums">-{usd(r.amount_usd)}</p>
                {statusBadge(r.status)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
