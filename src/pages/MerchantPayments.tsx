import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useVirtualCard } from "@/hooks/useVirtualCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  ShieldCheck,
  Store,
  AlertCircle,
} from "lucide-react";
import { ConvertBtcToCardDialog } from "@/components/card/ConvertBtcToCardDialog";
import { MerchantRequestForm, merchantBlockedReason } from "@/components/card/MerchantRequestForm";
import { usd } from "@/components/card/merchants";

type Filter = "all" | "pending" | "approved" | "declined";

const statusBadge = (s: string) =>
  s === "approved" ? (
    <Badge variant="outline" className="border-emerald-500/40 text-emerald-500">Paid</Badge>
  ) : s === "declined" ? (
    <Badge variant="outline" className="border-destructive/40 text-destructive">Declined</Badge>
  ) : (
    <Badge variant="outline" className="border-amber-500/40 text-amber-500">Pending review</Badge>
  );

const MerchantPayments = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const { card, merchantRequests, requestMerchantPayment, convertBtcToCard, loading } =
    useVirtualCard(userId);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
      setChecked(true);
    });
  }, [navigate]);

  const pendingHeld = useMemo(
    () =>
      merchantRequests
        .filter((r) => r.status === "pending")
        .reduce((s, r) => s + r.amount_usd, 0),
    [merchantRequests]
  );

  const activated = Boolean(card?.activated_at);
  const blockedReason = merchantBlockedReason(card);

  const filteredRequests = useMemo(() => {
    if (filter === "all") return merchantRequests;
    return merchantRequests.filter((r) => r.status === filter);
  }, [merchantRequests, filter]);

  const handleRequest = async (
    merchant: string,
    category: string,
    amountUsd: number,
    reference?: string
  ) => {
    const { error } = await requestMerchantPayment(merchant, category, amountUsd, reference);
    if (error) {
      toast({ title: "Payment not submitted", description: error, variant: "destructive" });
      return { error };
    }
    toast({
      title: `Payment to ${merchant} submitted`,
      description: `${usd(amountUsd)} is held on your card while the payment is processed.`,
    });
    return {};
  };

  if (!checked || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/wallet">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Merchant Payments</h1>
            <p className="text-sm text-muted-foreground">
              Pay exchanges, retail and subscriptions with your CTT spend card balance
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-8">
        <Card className="mb-6 border-border p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-primary/10 p-2">
                <CreditCard className="h-5 w-5 text-primary" />
              </span>
              <div>
                <p className="font-semibold">
                  {card ? `CTT spend card •••• ${card.last4}` : "No CTT spend card"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {card
                    ? `${card.network} · ${activated ? "activated" : "activation deposit required"}`
                    : "Activate a card in the card section to pay merchants"}
                </p>
              </div>
            </div>
            {card && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Card balance</p>
                  <p className="font-semibold tabular-nums">{usd(card.balance_usd)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Held pending</p>
                  <p className="font-semibold tabular-nums">{usd(pendingHeld)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Left today</p>
                  <p className="font-semibold tabular-nums">
                    {usd(Math.max(0, card.daily_limit - card.spent_today - pendingHeld))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Per payment</p>
                  <p className="font-semibold tabular-nums">{usd(card.per_tx_limit)}</p>
                </div>
              </div>
            )}
          </div>
          <div className="mt-4">
            <ConvertBtcToCardDialog userId={userId} card={card} onConvert={convertBtcToCard} />
          </div>
        </Card>

        {blockedReason ? (
          <Alert className="mb-6 border-amber-500/40 bg-amber-500/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{blockedReason}</AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-6 border-emerald-500/40 bg-emerald-500/10">
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription>
              Your card is ready. Payments are held on the card and confirmed once processed.
            </AlertDescription>
          </Alert>
        )}

        <div className="mb-3 flex items-center gap-2">
          <Store className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Choose a merchant</h2>
        </div>
        <div className="mb-8">
          <MerchantRequestForm
            card={card}
            pendingHeld={pendingHeld}
            blockedReason={blockedReason}
            onSubmit={handleRequest}
          />
        </div>

        <Card className="border-border p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Your payment requests</h2>
            <div className="flex flex-wrap gap-2">
              {(["all", "pending", "approved", "declined"] as Filter[]).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(f)}
                >
                  {f === "all" ? "All" : f === "approved" ? "Paid" : f.charAt(0).toUpperCase() + f.slice(1)}
                </Button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No merchant payments{filter !== "all" ? ` for ${filter}` : ""}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">
                        {new Date(r.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {r.merchant}
                        <div className="text-xs text-muted-foreground">{r.category}</div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.reference ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {usd(r.amount_usd)}
                      </TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.admin_note ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default MerchantPayments;
