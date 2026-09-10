import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useVirtualCard } from "@/hooks/useVirtualCard";
import { Store, ShieldCheck, ArrowRight } from "lucide-react";

interface Merchant {
  name: string;
  category: string;
  hint: string;
}

const MERCHANTS: Merchant[] = [
  { name: "Binance", category: "Exchange", hint: "Buy crypto with card" },
  { name: "Bybit", category: "Exchange", hint: "Fund derivatives account" },
  { name: "Amazon", category: "Retail", hint: "Checkout worldwide" },
  { name: "Apple", category: "Digital", hint: "App Store & iCloud" },
  { name: "Netflix", category: "Subscription", hint: "Monthly billing" },
  { name: "Steam", category: "Gaming", hint: "Wallet top-up" },
  { name: "Uber", category: "Travel", hint: "Rides & Uber Eats" },
  { name: "Booking.com", category: "Travel", hint: "Hotels & flights" },
];

const usd = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Merchant tiles that open the merchant payments page for the CTT spend card. */
export const SpendCardMerchants = ({ userId }: { userId?: string | null }) => {
  const navigate = useNavigate();
  const { card } = useVirtualCard(userId);

  const remainingToday = useMemo(
    () => (card ? Math.max(0, card.daily_limit - card.spent_today) : 0),
    [card]
  );
  const activated = Boolean(card?.activated_at);
  const balance = card?.balance_usd ?? 0;

  return (
    <Card className="mb-6 border-border p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-primary/10 p-2">
            <Store className="h-4 w-4 text-primary" />
          </span>
          <div>
            <h3 className="font-semibold">Spend your CTT card</h3>
            <p className="text-xs text-muted-foreground">
              Pay exchanges, retail and subscriptions straight from your card balance
            </p>
          </div>
        </div>
        {card && activated ? (
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-500">
            <ShieldCheck className="mr-1 h-3 w-3" /> Card ••{card.last4} · ${usd(balance)} balance · $
            {usd(remainingToday)} left today
          </Badge>
        ) : card ? (
          <Badge variant="outline" className="border-amber-500/40 text-amber-500">
            Card ••{card.last4} · activation deposit required
          </Badge>
        ) : (
          <Badge variant="outline">No active card</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MERCHANTS.map((m) => (
          <button
            key={m.name}
            type="button"
            onClick={() => navigate("/merchant-payments")}
            className="group rounded-xl border border-border bg-muted/30 p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{m.category}</p>
            <p className="mt-1 font-semibold group-hover:text-primary">{m.name}</p>
            <p className="text-[11px] text-muted-foreground">{m.hint}</p>
          </button>
        ))}
      </div>

      <Button className="mt-4 w-full sm:w-auto" onClick={() => navigate("/merchant-payments")}>
        Open merchant payments <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </Card>
  );
};
