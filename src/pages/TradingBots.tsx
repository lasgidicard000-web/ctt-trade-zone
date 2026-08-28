import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { useRealtimePrices } from "@/hooks/useRealtimePrices";
import { Bot, Grid3x3, LineChart, Pause, Play, Repeat, Sparkles, Square, Zap } from "lucide-react";
import { format } from "date-fns";

const db = supabase as any;
const num = (v: unknown) => (typeof v === "number" ? v : parseFloat(String(v ?? 0)) || 0);
const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

type Strategy = "grid" | "dca" | "martingale" | "ai_trend";

const STRATEGIES: {
  id: Strategy;
  name: string;
  icon: typeof Bot;
  risk: "Low" | "Medium" | "High";
  pair: string;
  blurb: string;
  perf: string;
}[] = [
  {
    id: "grid",
    name: "Grid Bot",
    icon: Grid3x3,
    risk: "Low",
    pair: "BTC",
    blurb: "Places a ladder of buy and sell orders inside a price range and harvests every swing between the grids.",
    perf: "+1.8% avg / 30d demo",
  },
  {
    id: "dca",
    name: "DCA Bot",
    icon: Repeat,
    risk: "Medium",
    pair: "ETH",
    blurb: "Averages into a position on a fixed interval and adds safety orders as price dips, then exits on target.",
    perf: "+2.4% avg / 30d demo",
  },
  {
    id: "martingale",
    name: "Martingale Bot",
    icon: Zap,
    risk: "High",
    pair: "BTC",
    blurb: "Scales position size aggressively after losing cycles to recover drawdown quickly. High variance.",
    perf: "+4.6% avg / 30d demo",
  },
  {
    id: "ai_trend",
    name: "AI Trend Bot",
    icon: Sparkles,
    risk: "Medium",
    pair: "BTC",
    blurb: "Follows momentum signals from the CTT AI engine, flipping long or flat as trend strength changes.",
    perf: "+3.2% avg / 30d demo",
  },
];

interface BotRow {
  id: string;
  name: string;
  strategy: Strategy;
  symbol: string;
  investment: number;
  status: string;
  grid_lower: number | null;
  grid_upper: number | null;
  grid_count: number | null;
  interval_minutes: number;
  safety_orders: number | null;
  take_profit_pct: number | null;
  stop_loss_pct: number | null;
  pnl: number;
  trades_count: number;
  created_at: string;
  stopped_at: string | null;
}

interface BotTrade {
  id: string;
  bot_id: string;
  side: string;
  price: number;
  qty: number;
  amount_usd: number;
  pnl: number;
  equity: number | null;
  note: string | null;
  created_at: string;
}

const TradingBots = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { prices } = useRealtimePrices();

  const [authChecked, setAuthChecked] = useState(false);
  const [balance, setBalance] = useState(0);
  const [bots, setBots] = useState<BotRow[]>([]);
  const [botTrades, setBotTrades] = useState<BotTrade[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [strategy, setStrategy] = useState<Strategy>("grid");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("BTC");
  const [investment, setInvestment] = useState("500");
  const [gridLower, setGridLower] = useState("");
  const [gridUpper, setGridUpper] = useState("");
  const [gridCount, setGridCount] = useState("20");
  const [intervalMinutes, setIntervalMinutes] = useState("5");
  const [safetyOrders, setSafetyOrders] = useState("3");
  const [takeProfit, setTakeProfit] = useState("12");
  const [stopLoss, setStopLoss] = useState("8");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) navigate("/auth");
      else setAuthChecked(true);
    });
  }, [navigate]);

  const refresh = useCallback(async () => {
    const [{ data: acc }, botRes, tradeRes] = await Promise.all([
      db.rpc("demo_get_account"),
      db.from("trading_bots").select("*").order("created_at", { ascending: false }),
      db.from("bot_trades").select("*").order("created_at", { ascending: false }).limit(300),
    ]);
    if (acc) setBalance(num(acc.balance));
    setBots(
      (botRes.data ?? []).map((b: any) => ({
        ...b,
        investment: num(b.investment),
        pnl: num(b.pnl),
        grid_lower: b.grid_lower === null ? null : num(b.grid_lower),
        grid_upper: b.grid_upper === null ? null : num(b.grid_upper),
        take_profit_pct: b.take_profit_pct === null ? null : num(b.take_profit_pct),
        stop_loss_pct: b.stop_loss_pct === null ? null : num(b.stop_loss_pct),
      })),
    );
    setBotTrades(
      (tradeRes.data ?? []).map((t: any) => ({
        ...t,
        price: num(t.price),
        qty: num(t.qty),
        amount_usd: num(t.amount_usd),
        pnl: num(t.pnl),
        equity: t.equity === null ? null : num(t.equity),
      })),
    );
  }, []);

  useEffect(() => {
    if (authChecked) refresh();
  }, [authChecked, refresh]);

  useEffect(() => {
    if (!authChecked) return;
    const run = async () => {
      const { data } = await db.rpc("demo_engine_tick");
      if (data?.botTrades > 0) refresh();
    };
    run();
    const id = setInterval(run, 20000);
    return () => clearInterval(id);
  }, [authChecked, refresh]);

  const preset = useMemo(() => STRATEGIES.find((s) => s.id === strategy)!, [strategy]);
  const livePrice = prices.find((p) => p.symbol === symbol)?.price ?? 0;

  const openDialog = (s: Strategy) => {
    const meta = STRATEGIES.find((x) => x.id === s)!;
    setStrategy(s);
    setName(`${meta.name} #${bots.length + 1}`);
    setSymbol(meta.pair);
    const px = prices.find((p) => p.symbol === meta.pair)?.price ?? 0;
    setGridLower(px ? (px * 0.94).toFixed(2) : "");
    setGridUpper(px ? (px * 1.06).toFixed(2) : "");
    setOpen(true);
  };

  const createBot = async () => {
    setSaving(true);
    const { error } = await db.rpc("bot_create", {
      _name: name,
      _strategy: strategy,
      _symbol: symbol,
      _investment: parseFloat(investment),
      _grid_lower: strategy === "grid" ? parseFloat(gridLower) || null : null,
      _grid_upper: strategy === "grid" ? parseFloat(gridUpper) || null : null,
      _grid_count: strategy === "grid" ? parseInt(gridCount, 10) || null : null,
      _interval_minutes: parseInt(intervalMinutes, 10) || 5,
      _safety_orders: strategy === "dca" || strategy === "martingale" ? parseInt(safetyOrders, 10) || null : null,
      _take_profit_pct: parseFloat(takeProfit) || null,
      _stop_loss_pct: parseFloat(stopLoss) || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Could not start bot", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Bot deployed", description: `${name} is now running on ${symbol}/USDT` });
    setOpen(false);
    refresh();
  };

  const setStatus = async (id: string, status: "running" | "paused" | "stopped") => {
    const { data, error } = await db.rpc("bot_set_status", { _bot_id: id, _status: status });
    if (error) {
      toast({ title: "Action failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: status === "stopped" ? "Bot stopped" : status === "paused" ? "Bot paused" : "Bot resumed",
      description:
        status === "stopped" ? `${fmtUsd(num(data.returned))} returned to your demo balance` : undefined,
    });
    refresh();
  };

  const activeBots = bots.filter((b) => b.status !== "stopped");
  const totalPnl = bots.reduce((s, b) => s + b.pnl, 0);
  const invested = activeBots.reduce((s, b) => s + b.investment, 0);
  const detail = bots.find((b) => b.id === selected) ?? null;
  const detailTrades = botTrades.filter((t) => t.bot_id === selected);

  const equityCurve = useMemo(() => {
    if (!detail) return [];
    const rows = [...detailTrades].reverse();
    return [
      { t: detail.created_at, equity: detail.investment },
      ...rows.map((r) => ({ t: r.created_at, equity: r.equity ?? detail.investment })),
    ];
  }, [detail, detailTrades]);

  if (!authChecked) return null;

  const statusBadge = (s: string) =>
    s === "running" ? "default" : s === "paused" ? "secondary" : "outline";

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Trading Bots</h1>
            <p className="text-sm text-muted-foreground">
              Automated strategies running on live prices with demo capital.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/demo-trading">
              <LineChart className="mr-1.5 h-4 w-4" />
              Demo Terminal
            </Link>
          </Button>
        </header>

        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          {[
            { label: "Demo balance", value: fmtUsd(balance) },
            { label: "Deployed capital", value: fmtUsd(invested) },
            { label: "Active bots", value: String(activeBots.length) },
            { label: "Total bot P&L", value: `${totalPnl >= 0 ? "+" : ""}${fmtUsd(totalPnl)}`, pnl: totalPnl },
          ].map((m) => (
            <Card key={m.label} className="p-4">
              <div className="text-xs text-muted-foreground">{m.label}</div>
              <div
                className={`mt-1 text-lg font-bold tabular-nums ${
                  m.pnl === undefined ? "" : m.pnl >= 0 ? "text-primary" : "text-destructive"
                }`}
              >
                {m.value}
              </div>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="marketplace">
          <TabsList>
            <TabsTrigger value="marketplace">Bot marketplace</TabsTrigger>
            <TabsTrigger value="mine">My bots ({bots.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="marketplace" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {STRATEGIES.map((s) => (
                <Card key={s.id} className="flex flex-col p-5">
                  <div className="mb-3 inline-flex w-fit rounded-lg bg-primary/10 p-2.5">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-base font-semibold">{s.name}</h2>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant={s.risk === "High" ? "destructive" : s.risk === "Low" ? "secondary" : "outline"}>
                      {s.risk} risk
                    </Badge>
                    <span className="text-xs text-muted-foreground">{s.pair}/USDT</span>
                  </div>
                  <p className="mt-3 flex-1 text-sm text-muted-foreground">{s.blurb}</p>
                  <div className="mt-3 text-xs font-medium text-primary">{s.perf}</div>
                  <Button className="mt-4" size="sm" onClick={() => openDialog(s.id)}>
                    <Bot className="mr-1.5 h-4 w-4" />
                    Deploy bot
                  </Button>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="mine" className="mt-4 space-y-3">
            {bots.length === 0 ? (
              <Card className="p-10 text-center text-sm text-muted-foreground">
                No bots yet — deploy one from the marketplace.
              </Card>
            ) : (
              bots.map((b) => {
                const roi = b.investment > 0 ? (b.pnl / b.investment) * 100 : 0;
                const meta = STRATEGIES.find((s) => s.id === b.strategy);
                return (
                  <Card key={b.id} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2">
                          {meta ? <meta.icon className="h-4 w-4 text-primary" /> : <Bot className="h-4 w-4 text-primary" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{b.name}</span>
                            <Badge variant={statusBadge(b.status)} className="capitalize">{b.status}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {b.symbol}/USDT · {meta?.name ?? b.strategy} · every {b.interval_minutes}m ·{" "}
                            {b.trades_count} trades · started {format(new Date(b.created_at), "MMM dd, HH:mm")}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-5">
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Invested</div>
                          <div className="text-sm font-mono">{fmtUsd(b.investment)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">P&amp;L</div>
                          <div className={`text-sm font-bold tabular-nums ${b.pnl >= 0 ? "text-primary" : "text-destructive"}`}>
                            {b.pnl >= 0 ? "+" : ""}
                            {fmtUsd(b.pnl)} ({roi >= 0 ? "+" : ""}
                            {roi.toFixed(2)}%)
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setSelected(b.id)}>
                            Details
                          </Button>
                          {b.status === "running" && (
                            <Button size="sm" variant="outline" onClick={() => setStatus(b.id, "paused")}>
                              <Pause className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {b.status === "paused" && (
                            <Button size="sm" variant="outline" onClick={() => setStatus(b.id, "running")}>
                              <Play className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {b.status !== "stopped" && (
                            <Button size="sm" variant="destructive" onClick={() => setStatus(b.id, "stopped")}>
                              <Square className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create bot */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Deploy {preset.name}</DialogTitle>
            <DialogDescription>
              Runs on live {symbol}/USDT prices using demo capital. Available: {fmtUsd(balance)}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-xs">Bot name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Pair</Label>
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger className="mt-1">
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
            </div>
            <div>
              <Label className="text-xs">Investment (USDT, min 100)</Label>
              <Input
                type="number"
                value={investment}
                onChange={(e) => setInvestment(e.target.value)}
                className="mt-1 font-mono"
              />
            </div>

            {strategy === "grid" && (
              <>
                <div>
                  <Label className="text-xs">Lower price</Label>
                  <Input type="number" value={gridLower} onChange={(e) => setGridLower(e.target.value)} className="mt-1 font-mono" />
                </div>
                <div>
                  <Label className="text-xs">Upper price</Label>
                  <Input type="number" value={gridUpper} onChange={(e) => setGridUpper(e.target.value)} className="mt-1 font-mono" />
                </div>
                <div>
                  <Label className="text-xs">Grid levels</Label>
                  <Input type="number" value={gridCount} onChange={(e) => setGridCount(e.target.value)} className="mt-1 font-mono" />
                </div>
              </>
            )}

            {(strategy === "dca" || strategy === "martingale") && (
              <div>
                <Label className="text-xs">Safety orders</Label>
                <Input type="number" value={safetyOrders} onChange={(e) => setSafetyOrders(e.target.value)} className="mt-1 font-mono" />
              </div>
            )}

            <div>
              <Label className="text-xs">Cycle interval (minutes)</Label>
              <Input type="number" value={intervalMinutes} onChange={(e) => setIntervalMinutes(e.target.value)} className="mt-1 font-mono" />
            </div>
            <div>
              <Label className="text-xs">Take profit (%)</Label>
              <Input type="number" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} className="mt-1 font-mono" />
            </div>
            <div>
              <Label className="text-xs">Stop loss (%)</Label>
              <Input type="number" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} className="mt-1 font-mono" />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Live {symbol}/USDT price: <span className="font-mono">{livePrice ? fmtUsd(livePrice) : "—"}</span>
          </p>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={createBot} disabled={saving}>
              {saving ? "Deploying…" : "Deploy bot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bot detail */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detail?.name}</DialogTitle>
            <DialogDescription>
              {detail?.symbol}/USDT · {detail?.strategy} · {detail?.trades_count} trades · status {detail?.status}
            </DialogDescription>
          </DialogHeader>

          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Invested</div>
                  <div className="font-mono">{fmtUsd(detail.investment)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">P&amp;L</div>
                  <div className={`font-mono ${detail.pnl >= 0 ? "text-primary" : "text-destructive"}`}>
                    {detail.pnl >= 0 ? "+" : ""}
                    {fmtUsd(detail.pnl)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">TP / SL</div>
                  <div className="font-mono">
                    {detail.take_profit_pct ?? "—"}% / {detail.stop_loss_pct ?? "—"}%
                  </div>
                </div>
              </div>

              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equityCurve}>
                    <defs>
                      <linearGradient id="botEquity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="t"
                      tickFormatter={(t) => format(new Date(t as string), "HH:mm")}
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: 11 }}
                    />
                    <YAxis domain={["auto", "auto"]} stroke="hsl(var(--muted-foreground))" style={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v) => [fmtUsd(Number(v)), "Equity"]}
                    />
                    <Area type="monotone" dataKey="equity" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#botEquity)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="max-h-56 overflow-y-auto">
                {detailTrades.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No cycles executed yet — the first trade lands after one interval.
                  </p>
                ) : (
                  detailTrades.map((t) => (
                    <div key={t.id} className="flex items-center justify-between border-b border-border py-2 text-xs last:border-0">
                      <span className={t.side === "buy" ? "text-primary" : "text-destructive"}>{t.side.toUpperCase()}</span>
                      <span className="font-mono">{fmtUsd(t.price)}</span>
                      <span className="font-mono">{t.qty.toFixed(6)}</span>
                      <span className={`font-mono ${t.pnl >= 0 ? "text-primary" : "text-destructive"}`}>
                        {t.pnl >= 0 ? "+" : ""}
                        {fmtUsd(t.pnl)}
                      </span>
                      <span className="text-muted-foreground">
                        {format(new Date(t.created_at), "MMM dd HH:mm")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default TradingBots;
