import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRealtimePrices } from "@/hooks/useRealtimePrices";
import { useLiveTrading } from "@/hooks/useLiveTrading";
import { useVirtualCard } from "@/hooks/useVirtualCard";
import OrderBook from "@/components/demo/OrderBook";
import PairChart from "@/components/demo/PairChart";
import FundWithCardDialog from "@/components/live/FundWithCardDialog";
import LiveWithdrawDialog from "@/components/live/LiveWithdrawDialog";
import {
  ArrowUpRight,
  CandlestickChart,
  CreditCard,
  Lock,
  Wallet2,
  Zap,
} from "lucide-react";

const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

const LiveTrading = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { prices } = useRealtimePrices();

  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const {
    account,
    holdings,
    openOrders,
    trades,
    funding,
    withdrawals,
    tick,
    fundFromCard,
    placeOrder,
    cancelOrder,
    withdraw,
  } = useLiveTrading();
  const { card, reveal } = useVirtualCard(userId);

  const [symbol, setSymbol] = useState("BTC");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [amount, setAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fundOpen, setFundOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) navigate("/auth");
      else {
        setUserId(session.user.id);
        setAuthChecked(true);
      }
    });
  }, [navigate]);

  const priceMap = useMemo(() => {
    const m = new Map<string, { price: number; change: number; name: string }>();
    prices.forEach((p) => m.set(p.symbol, { price: p.price, change: p.change_24h, name: p.name }));
    return m;
  }, [prices]);

  const marketInfo = priceMap.get(symbol);
  const lastPrice = marketInfo?.price ?? 0;
  const change = marketInfo?.change ?? 0;

  useEffect(() => {
    if (lastPrice && !limitPrice) setLimitPrice(lastPrice.toFixed(lastPrice >= 1000 ? 2 : 4));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastPrice]);

  const balance = account?.balance ?? 0;
  const realized = account?.realized_pnl ?? 0;
  const holdingsValue = holdings.reduce(
    (s, h) => s + h.qty * (priceMap.get(h.coin_symbol)?.price ?? h.avg_price),
    0,
  );
  const equity = balance + holdingsValue;
  const heldQty = holdings.find((h) => h.coin_symbol === symbol)?.qty ?? 0;

  const cardActive = !!card && card.status === "active";

  const submitOrder = async (side: "buy" | "sell") => {
    const amt = parseFloat(amount);
    if (!amt || amt < 10) {
      toast({ title: "Minimum order is $10", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error, result } = await placeOrder({
      symbol,
      side,
      orderType,
      amountUsd: amt,
      limitPrice: parseFloat(limitPrice),
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Order rejected", description: error, variant: "destructive" });
      return;
    }
    toast({
      title: result?.status === "filled" ? "Order filled" : "Limit order placed",
      description:
        result?.status === "filled"
          ? `${side.toUpperCase()} ${Number(result.qty).toFixed(6)} ${symbol} @ ${fmtUsd(Number(result.price))}`
          : `Resting at ${fmtUsd(parseFloat(limitPrice))}`,
    });
    setAmount("");
  };

  const onCancel = async (id: string) => {
    const { error } = await cancelOrder(id);
    if (error) toast({ title: "Could not cancel", description: error, variant: "destructive" });
    else toast({ title: "Order cancelled" });
  };

  const verifyPin = async (pin: string) => {
    const res = await reveal(pin);
    return res.error ? { error: res.error } : {};
  };

  if (!authChecked) return null;

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Live Trading Terminal</h1>
            <p className="text-sm text-muted-foreground">
              Real, withdrawable balance. Funded exclusively with your CTT spend card.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/demo-trading">
                <CandlestickChart className="mr-1.5 h-4 w-4" />
                Demo terminal
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => tick()}>
              <Zap className="mr-1.5 h-4 w-4" />
              Sync engine
            </Button>
          </div>
        </header>

        {!cardActive && (
          <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border-primary/40 p-4">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <div className="text-sm font-semibold">
                  Your CTT spend card is required to fund live trading
                </div>
                <p className="text-xs text-muted-foreground">
                  {card
                    ? `Card ••••${card.last4} is ${card.status}. Activate it to deposit.`
                    : "No active card yet — the spend card is the only deposit method for this terminal."}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link to="/wallet">
                <CreditCard className="mr-1.5 h-4 w-4" />
                Manage card
              </Link>
            </Button>
          </Card>
        )}

        {/* Balance strip */}
        <Card className="mb-4 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <div className="text-xs text-muted-foreground">Live balance</div>
            <div className="text-2xl font-bold tabular-nums">{fmtUsd(balance)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Holdings value</div>
            <div className="text-lg font-semibold tabular-nums">{fmtUsd(holdingsValue)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Equity</div>
            <div className="text-lg font-semibold tabular-nums">{fmtUsd(equity)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Realised P&L</div>
            <div
              className={`text-lg font-semibold tabular-nums ${realized >= 0 ? "text-primary" : "text-destructive"}`}
            >
              {realized >= 0 ? "+" : ""}
              {fmtUsd(realized)}
            </div>
          </div>
          <div className="flex items-end gap-2">
            <Button size="sm" className="flex-1" disabled={!cardActive} onClick={() => setFundOpen(true)}>
              <CreditCard className="mr-1.5 h-4 w-4" />
              Fund with card
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              disabled={balance < 10}
              onClick={() => setWithdrawOpen(true)}
            >
              <ArrowUpRight className="mr-1.5 h-4 w-4" />
              Withdraw
            </Button>
          </div>
        </Card>

        {/* Market header */}
        <Card className="mb-4 flex flex-wrap items-center gap-6 p-4">
          <Select value={symbol} onValueChange={setSymbol}>
            <SelectTrigger className="w-[190px] font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {prices.map((p) => (
                <SelectItem key={p.symbol} value={p.symbol}>
                  {p.symbol}/USDT
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div>
            <div className="text-2xl font-bold tabular-nums">{lastPrice ? fmtUsd(lastPrice) : "—"}</div>
            <div className={`text-xs font-medium ${change >= 0 ? "text-primary" : "text-destructive"}`}>
              {change >= 0 ? "+" : ""}
              {change.toFixed(2)}% (24h)
            </div>
          </div>
          <div className="hidden gap-6 text-xs sm:flex">
            <div>
              <div className="text-muted-foreground">Asset</div>
              <div className="font-mono">{marketInfo?.name ?? symbol}</div>
            </div>
            <div>
              <div className="text-muted-foreground">You hold</div>
              <div className="font-mono">
                {heldQty.toFixed(6)} {symbol}
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-6 xl:col-span-7">
            <Card className="overflow-hidden">
              <PairChart symbol={symbol} price={lastPrice} />
            </Card>

            <Card className="p-4">
              <Tabs defaultValue="holdings">
                <TabsList className="flex-wrap">
                  <TabsTrigger value="holdings">Holdings ({holdings.length})</TabsTrigger>
                  <TabsTrigger value="orders">Open orders ({openOrders.length})</TabsTrigger>
                  <TabsTrigger value="history">Trades</TabsTrigger>
                  <TabsTrigger value="funding">Funding</TabsTrigger>
                  <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
                </TabsList>

                <TabsContent value="holdings" className="mt-4">
                  {holdings.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No holdings yet. Fund with your card and place your first order.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {holdings.map((h) => {
                        const px = priceMap.get(h.coin_symbol)?.price ?? h.avg_price;
                        const value = h.qty * px;
                        const pnl = (px - h.avg_price) * h.qty;
                        return (
                          <div
                            key={h.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
                          >
                            <div>
                              <div className="text-sm font-semibold">{h.coin_symbol}/USDT</div>
                              <div className="text-xs text-muted-foreground">
                                {h.qty.toFixed(6)} @ avg {fmtUsd(h.avg_price)} · mark {fmtUsd(px)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold tabular-nums">{fmtUsd(value)}</div>
                              <div
                                className={`text-xs ${pnl >= 0 ? "text-primary" : "text-destructive"}`}
                              >
                                {pnl >= 0 ? "+" : ""}
                                {fmtUsd(pnl)} unrealised
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="orders" className="mt-4">
                  {openOrders.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No resting orders.</p>
                  ) : (
                    <div className="space-y-2">
                      {openOrders.map((o) => (
                        <div
                          key={o.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                        >
                          <div>
                            <div className="text-sm font-semibold">
                              {o.side.toUpperCase()} {o.symbol}/USDT
                              <span className="ml-2 text-xs font-normal text-muted-foreground">
                                {o.order_type}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {fmtUsd(o.amount_usd)} @ {o.price ? fmtUsd(o.price) : "market"}
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => onCancel(o.id)}>
                            Cancel
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                  {trades.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No trades yet.</p>
                  ) : (
                    <div className="max-h-80 space-y-1 overflow-y-auto">
                      {trades.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between gap-3 border-b border-border py-2 text-xs last:border-0"
                        >
                          <span className={t.side === "buy" ? "text-primary" : "text-destructive"}>
                            {t.side.toUpperCase()}
                          </span>
                          <span className="font-medium">{t.symbol}/USDT</span>
                          <span className="font-mono">{t.qty.toFixed(6)}</span>
                          <span className="font-mono">{fmtUsd(t.price)}</span>
                          <span className="font-mono text-muted-foreground">fee {fmtUsd(t.fee)}</span>
                          <span
                            className={`font-mono ${t.pnl >= 0 ? "text-primary" : "text-destructive"}`}
                          >
                            {t.side === "buy" ? "—" : `${t.pnl >= 0 ? "+" : ""}${fmtUsd(t.pnl)}`}
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(t.created_at).toLocaleString([], { hour12: false })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="funding" className="mt-4">
                  {funding.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No card deposits yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {funding.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-xs"
                        >
                          <div>
                            <div className="text-sm font-semibold">{fmtUsd(f.amount_usd)}</div>
                            <div className="text-muted-foreground">
                              {f.amount_btc.toFixed(8)} BTC @ {fmtUsd(f.btc_rate)} ·{" "}
                              {new Date(f.created_at).toLocaleString([], { hour12: false })}
                            </div>
                          </div>
                          <Badge variant="secondary" className="capitalize">
                            card · {f.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="withdrawals" className="mt-4">
                  {withdrawals.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No withdrawals yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {withdrawals.map((w) => (
                        <div
                          key={w.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold">{fmtUsd(w.amount)}</div>
                            <div className="truncate text-muted-foreground">
                              {w.wallet_address} · fee {fmtUsd(w.fee)} ·{" "}
                              {new Date(w.created_at).toLocaleString([], { hour12: false })}
                            </div>
                          </div>
                          <Badge
                            variant={
                              w.status === "completed"
                                ? "default"
                                : w.status === "rejected"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="capitalize"
                          >
                            {w.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          <Card className="overflow-hidden lg:col-span-3 xl:col-span-2">
            <OrderBook price={lastPrice} symbol={symbol} />
          </Card>

          <div className="space-y-4 lg:col-span-3">
            <Card className="p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Wallet2 className="h-4 w-4 text-primary" />
                Spot order
              </div>

              <Tabs value={orderType} onValueChange={(v) => setOrderType(v as "market" | "limit")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="market">Market</TabsTrigger>
                  <TabsTrigger value="limit">Limit</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="mt-4 space-y-3">
                {orderType === "limit" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="live-limit">Limit price (USD)</Label>
                    <Input
                      id="live-limit"
                      type="number"
                      step="0.0001"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="live-amount">Amount (USD)</Label>
                  <Input
                    id="live-amount"
                    type="number"
                    min="10"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                  <div className="flex gap-1.5">
                    {[0.25, 0.5, 0.75, 1].map((p) => (
                      <Button
                        key={p}
                        type="button"
                        size="sm"
                        variant="outline"
                        className="flex-1 px-0 text-xs"
                        onClick={() => setAmount((balance * p).toFixed(2))}
                      >
                        {p * 100}%
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Available {fmtUsd(balance)} · fee 0.10% · min $10
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button disabled={submitting || balance <= 0} onClick={() => submitOrder("buy")}>
                    Buy {symbol}
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={submitting || heldQty <= 0}
                    onClick={() => submitOrder("sell")}
                  >
                    Sell {symbol}
                  </Button>
                </div>

                {balance <= 0 && (
                  <p className="text-xs text-muted-foreground">
                    Balance is empty — fund it with your CTT spend card to start trading.
                  </p>
                )}
              </div>
            </Card>

            <Card className="p-4 text-xs text-muted-foreground">
              <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <CreditCard className="h-4 w-4 text-primary" />
                Deposits
              </div>
              The CTT spend card is the only way to deposit into this terminal. Withdrawals go straight
              to an external wallet — min $10, 1% fee (min $1) — with or without closing your positions.
            </Card>
          </div>
        </div>
      </div>

      {card && (
        <FundWithCardDialog
          open={fundOpen}
          onOpenChange={setFundOpen}
          last4={card.last4}
          network={card.network}
          perTxLimit={card.per_tx_limit}
          remainingToday={card.daily_limit - card.spent_today}
          hasPin={card.has_pin}
          verifyPin={verifyPin}
          onFund={(amt) => fundFromCard(card.id, amt)}
        />
      )}

      <LiveWithdrawDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        available={balance}
        onWithdraw={withdraw}
      />
    </main>
  );
};

export default LiveTrading;
