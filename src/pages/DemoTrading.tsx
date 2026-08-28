import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRealtimePrices } from "@/hooks/useRealtimePrices";
import { useDemoTrading } from "@/hooks/useDemoTrading";
import OrderBook from "@/components/demo/OrderBook";
import PairChart from "@/components/demo/PairChart";
import { Bot, RotateCcw, TrendingDown, TrendingUp, Wallet2, Zap } from "lucide-react";

const db = supabase as any;
const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

const DemoTrading = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { prices } = useRealtimePrices();
  const { account, openOrders, positions, openPositions, trades, refresh, tick } = useDemoTrading();

  const [authChecked, setAuthChecked] = useState(false);
  const [symbol, setSymbol] = useState("BTC");
  const [market, setMarket] = useState<"spot" | "futures">("spot");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [amount, setAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [leverage, setLeverage] = useState(10);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) navigate("/auth");
      else setAuthChecked(true);
    });
  }, [navigate]);

  const priceMap = useMemo(() => {
    const m = new Map<string, { price: number; change: number; name: string }>();
    prices.forEach((p) => m.set(p.symbol, { price: p.price, change: p.change_24h, name: p.name }));
    return m;
  }, [prices]);

  const market_ = priceMap.get(symbol);
  const lastPrice = market_?.price ?? 0;
  const change = market_?.change ?? 0;

  useEffect(() => {
    if (lastPrice && !limitPrice) setLimitPrice(lastPrice.toFixed(lastPrice >= 1000 ? 2 : 4));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastPrice]);

  const unrealised = useMemo(
    () =>
      openPositions.reduce((sum, p) => {
        const px = priceMap.get(p.symbol)?.price ?? p.entry_price;
        const pnl = p.side === "long" || p.side === "buy"
          ? (px - p.entry_price) * p.qty
          : (p.entry_price - px) * p.qty;
        return sum + pnl;
      }, 0),
    [openPositions, priceMap],
  );

  const lockedMargin = openPositions.reduce((s, p) => s + p.margin, 0);
  const balance = account?.balance ?? 0;
  const equity = balance + lockedMargin + unrealised;

  const positionPnl = (p: typeof openPositions[number]) => {
    const px = priceMap.get(p.symbol)?.price ?? p.entry_price;
    const pnl = p.side === "long" || p.side === "buy"
      ? (px - p.entry_price) * p.qty
      : (p.entry_price - px) * p.qty;
    return { px, pnl, roi: p.margin > 0 ? (pnl / p.margin) * 100 : 0 };
  };

  const placeOrder = async (side: string) => {
    const amt = parseFloat(amount);
    if (!amt || amt < 10) {
      toast({ title: "Minimum order is 10 USDT", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await db.rpc("demo_place_order", {
      _symbol: symbol,
      _market: market,
      _side: side,
      _order_type: orderType,
      _amount_usd: amt,
      _limit_price: orderType === "limit" ? parseFloat(limitPrice) : null,
      _leverage: market === "futures" ? leverage : 1,
    });
    setSubmitting(false);

    if (error) {
      toast({ title: "Order rejected", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: data?.status === "filled" ? "Order filled" : "Limit order placed",
      description:
        data?.status === "filled"
          ? `${side.toUpperCase()} ${Number(data.qty).toFixed(6)} ${symbol} @ ${fmtUsd(Number(data.price))}`
          : `Resting at ${fmtUsd(parseFloat(limitPrice))}`,
    });
    setAmount("");
    refresh();
  };

  const closePosition = async (id: string) => {
    const { data, error } = await db.rpc("demo_close_position", { _position_id: id, _reason: "manual" });
    if (error) {
      toast({ title: "Could not close", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Position closed",
      description: `Realised P&L ${Number(data.pnl) >= 0 ? "+" : ""}${fmtUsd(Number(data.pnl))}`,
    });
    refresh();
  };

  const cancelOrder = async (id: string) => {
    const { error } = await db.rpc("demo_cancel_order", { _order_id: id });
    if (error) toast({ title: "Could not cancel", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Order cancelled" });
      refresh();
    }
  };

  const resetAccount = async () => {
    const { error } = await db.rpc("demo_reset_account");
    if (error) toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Demo account reset", description: "Balance restored to 10,000 USDT" });
      refresh();
    }
  };

  const pct = (p: number) => {
    const avail = balance;
    setAmount((avail * p).toFixed(2));
  };

  if (!authChecked) return null;

  const buyLabel = market === "spot" ? "Buy / Long" : "Open Long";
  const sellLabel = market === "spot" ? "Sell / Short" : "Open Short";

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Demo Trading Terminal</h1>
            <p className="text-sm text-muted-foreground">
              Live market data, paper funds. Nothing here touches your real portfolio.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/trading-bots">
                <Bot className="mr-1.5 h-4 w-4" />
                Trading Bots
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => tick()}>
              <Zap className="mr-1.5 h-4 w-4" />
              Sync engine
            </Button>
            <Button variant="ghost" size="sm" onClick={resetAccount}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Reset demo
            </Button>
          </div>
        </header>

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
              <div className="text-muted-foreground">24h High</div>
              <div className="font-mono">{fmtUsd(lastPrice * (1 + Math.abs(change) / 100))}</div>
            </div>
            <div>
              <div className="text-muted-foreground">24h Low</div>
              <div className="font-mono">{fmtUsd(lastPrice * (1 - Math.abs(change) / 100))}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Asset</div>
              <div className="font-mono">{market_?.name ?? symbol}</div>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-12">
          {/* Chart + tables */}
          <div className="space-y-4 lg:col-span-6 xl:col-span-7">
            <Card className="overflow-hidden">
              <PairChart symbol={symbol} price={lastPrice} />
            </Card>

            <Card className="p-4">
              <Tabs defaultValue="positions">
                <TabsList>
                  <TabsTrigger value="positions">Positions ({openPositions.length})</TabsTrigger>
                  <TabsTrigger value="orders">Open orders ({openOrders.length})</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="positions" className="mt-4">
                  {openPositions.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No open positions.</p>
                  ) : (
                    <div className="space-y-2">
                      {openPositions.map((p) => {
                        const { px, pnl, roi } = positionPnl(p);
                        return (
                          <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                            <div className="flex items-center gap-3">
                              <Badge variant={p.side === "long" || p.side === "buy" ? "default" : "destructive"}>
                                {p.side.toUpperCase()} {p.leverage}x
                              </Badge>
                              <div>
                                <div className="text-sm font-semibold">{p.symbol}/USDT</div>
                                <div className="text-xs text-muted-foreground">
                                  {p.market} · entry {fmtUsd(p.entry_price)} · mark {fmtUsd(px)}
                                  {p.liq_price ? ` · liq ${fmtUsd(p.liq_price)}` : ""}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className={`text-sm font-bold tabular-nums ${pnl >= 0 ? "text-primary" : "text-destructive"}`}>
                                  {pnl >= 0 ? "+" : ""}
                                  {fmtUsd(pnl)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {roi >= 0 ? "+" : ""}
                                  {roi.toFixed(2)}% on {fmtUsd(p.margin)}
                                </div>
                              </div>
                              <Button size="sm" variant="outline" onClick={() => closePosition(p.id)}>
                                Close
                              </Button>
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
                        <div key={o.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                          <div>
                            <div className="text-sm font-semibold">
                              {o.side.toUpperCase()} {o.symbol}/USDT
                              <span className="ml-2 text-xs font-normal text-muted-foreground">
                                {o.order_type} · {o.market} · {o.leverage}x
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {fmtUsd(o.amount_usd)} margin @ {o.price ? fmtUsd(o.price) : "market"}
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => cancelOrder(o.id)}>
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
                        <div key={t.id} className="flex items-center justify-between gap-3 border-b border-border py-2 text-xs last:border-0">
                          <span className={t.side === "buy" ? "text-primary" : "text-destructive"}>
                            {t.side.toUpperCase()}
                          </span>
                          <span className="font-medium">{t.symbol}/USDT</span>
                          <span className="font-mono">{t.qty.toFixed(6)}</span>
                          <span className="font-mono">{fmtUsd(t.price)}</span>
                          <span className="capitalize text-muted-foreground">{t.kind}</span>
                          <span className={`font-mono ${t.pnl >= 0 ? "text-primary" : "text-destructive"}`}>
                            {t.kind === "open" ? "—" : `${t.pnl >= 0 ? "+" : ""}${fmtUsd(t.pnl)}`}
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(t.created_at).toLocaleString([], { hour12: false })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* Order book */}
          <Card className="overflow-hidden lg:col-span-3 xl:col-span-2">
            <OrderBook price={lastPrice} symbol={symbol} />
          </Card>

          {/* Order panel */}
          <div className="space-y-4 lg:col-span-3">
            <Card className="p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Wallet2 className="h-4 w-4 text-primary" />
                Demo wallet
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Equity</span>
                  <span className="font-bold tabular-nums">{fmtUsd(equity)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available</span>
                  <span className="tabular-nums">{fmtUsd(balance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Used margin</span>
                  <span className="tabular-nums">{fmtUsd(lockedMargin)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unrealised P&amp;L</span>
                  <span className={`tabular-nums ${unrealised >= 0 ? "text-primary" : "text-destructive"}`}>
                    {unrealised >= 0 ? "+" : ""}
                    {fmtUsd(unrealised)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Realised P&amp;L</span>
                  <span className={`tabular-nums ${(account?.realized_pnl ?? 0) >= 0 ? "text-primary" : "text-destructive"}`}>
                    {(account?.realized_pnl ?? 0) >= 0 ? "+" : ""}
                    {fmtUsd(account?.realized_pnl ?? 0)}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <Tabs value={market} onValueChange={(v) => setMarket(v as "spot" | "futures")}>
                <TabsList className="w-full">
                  <TabsTrigger value="spot" className="flex-1">Spot</TabsTrigger>
                  <TabsTrigger value="futures" className="flex-1">Futures</TabsTrigger>
                </TabsList>
              </Tabs>

              <Tabs value={orderType} onValueChange={(v) => setOrderType(v as "market" | "limit")} className="mt-3">
                <TabsList className="h-8 w-full">
                  <TabsTrigger value="market" className="h-6 flex-1 text-xs">Market</TabsTrigger>
                  <TabsTrigger value="limit" className="h-6 flex-1 text-xs">Limit</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="mt-4 space-y-3">
                {orderType === "limit" && (
                  <div>
                    <Label className="text-xs">Limit price (USDT)</Label>
                    <Input
                      type="number"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      className="mt-1 font-mono"
                    />
                  </div>
                )}

                <div>
                  <Label className="text-xs">{market === "futures" ? "Margin" : "Amount"} (USDT)</Label>
                  <Input
                    type="number"
                    placeholder="min 10"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 font-mono"
                  />
                  <div className="mt-2 grid grid-cols-4 gap-1">
                    {[0.25, 0.5, 0.75, 1].map((p) => (
                      <Button key={p} size="sm" variant="outline" className="h-7 text-xs" onClick={() => pct(p)}>
                        {p * 100}%
                      </Button>
                    ))}
                  </div>
                </div>

                {market === "futures" && (
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <Label>Leverage</Label>
                      <span className="font-mono font-semibold">{leverage}x</span>
                    </div>
                    <Slider
                      className="mt-2"
                      min={1}
                      max={50}
                      step={1}
                      value={[leverage]}
                      onValueChange={(v) => setLeverage(v[0])}
                    />
                  </div>
                )}

                <div className="rounded-lg bg-muted/40 p-3 text-xs">
                  {(() => {
                    const amt = parseFloat(amount) || 0;
                    const lev = market === "futures" ? leverage : 1;
                    const px = orderType === "limit" ? parseFloat(limitPrice) || lastPrice : lastPrice;
                    const notional = amt * lev;
                    const qty = px > 0 ? notional / px : 0;
                    const fee = notional * (market === "futures" ? 0.0006 : 0.001);
                    return (
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Order value</span>
                          <span className="font-mono">{fmtUsd(notional)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Size</span>
                          <span className="font-mono">{qty.toFixed(6)} {symbol}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Est. fee</span>
                          <span className="font-mono">{fmtUsd(fee)}</span>
                        </div>
                        {market === "futures" && px > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Liq. price (long/short)</span>
                            <span className="font-mono">
                              {fmtUsd(px * (1 - 0.9 / leverage))} / {fmtUsd(px * (1 + 0.9 / leverage))}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    disabled={submitting}
                    onClick={() => placeOrder(market === "spot" ? "buy" : "long")}
                  >
                    <TrendingUp className="mr-1.5 h-4 w-4" />
                    {buyLabel}
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={submitting}
                    onClick={() => placeOrder(market === "spot" ? "sell" : "short")}
                  >
                    <TrendingDown className="mr-1.5 h-4 w-4" />
                    {sellLabel}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
};

export default DemoTrading;
