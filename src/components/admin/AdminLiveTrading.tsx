import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ArrowDownToLine,
  Loader2,
  Lock,
  RefreshCw,
  Save,
  Settings2,
  Unlock,
  XOctagon,
} from "lucide-react";

const db = supabase as any;

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

const num = (v: unknown) => (typeof v === "number" ? v : parseFloat(String(v ?? 0)) || 0);

interface LiveSettings {
  enabled: boolean;
  fee_pct: number;
  min_order_usd: number;
  min_funding_usd: number;
  min_withdrawal_usd: number;
  withdrawal_fee_pct: number;
  withdrawal_fee_min: number;
  updated_at?: string | null;
}

interface LiveAccountRow {
  user_id: string;
  display_name: string | null;
  balance: number;
  realized_pnl: number;
  frozen: boolean;
  frozen_reason: string | null;
  holdings_value: number;
  open_orders: number;
  trades_count: number;
  funded_total: number;
  pending_withdrawals: number;
  last_trade_at: string | null;
}

interface WithdrawalRow {
  id: string;
  user_id: string;
  amount: number;
  fee: number;
  wallet_address: string;
  status: string;
  notes: string | null;
  created_at: string;
}

interface PnlRow {
  user_id: string;
  display_name: string | null;
  funded_total: number;
  realized_pnl: number;
  unrealized_pnl: number;
  fees_total: number;
  gross_profit: number;
  gross_loss: number;
  withdrawn_total: number;
  pending_withdrawal_total: number;
  trades_count: number;
  last_trade_at: string | null;
}

interface MemberTrade {
  id: string;
  symbol: string;
  side: string;
  qty: number;
  price: number;
  fee: number;
  pnl: number;
  created_at: string;
}

const netPosition = (p: PnlRow) => p.funded_total + p.realized_pnl + p.unrealized_pnl;

const payoutExceedsEarnings = (p: PnlRow) =>
  p.pending_withdrawal_total > 0 &&
  p.pending_withdrawal_total > p.funded_total + p.realized_pnl - p.withdrawn_total;

const verdictBadge = (p: PnlRow) => {
  const net = p.realized_pnl + p.unrealized_pnl;
  if (net > 0.005)
    return (
      <Badge variant="outline" className="border-green-500/20 bg-green-500/10 text-green-600">
        In profit
      </Badge>
    );
  if (net < -0.005)
    return (
      <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-red-600">
        At a loss
      </Badge>
    );
  return <Badge variant="outline">Break even</Badge>;
};

const MemberPnlSummary = ({ pnl }: { pnl?: PnlRow }) => {
  if (!pnl) return null;
  const flagged = payoutExceedsEarnings(pnl);
  return (
    <div className="mt-2 rounded-md border bg-muted/40 p-2 text-xs">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span>
          Realised{" "}
          <span className={pnl.realized_pnl >= 0 ? "text-green-600" : "text-red-600"}>
            {usd(pnl.realized_pnl)}
          </span>
        </span>
        <span>
          Unrealised{" "}
          <span className={pnl.unrealized_pnl >= 0 ? "text-green-600" : "text-red-600"}>
            {usd(pnl.unrealized_pnl)}
          </span>
        </span>
        <span>Funded {usd(pnl.funded_total)}</span>
        <span>Net position {usd(netPosition(pnl))}</span>
        <span>Withdrawn {usd(pnl.withdrawn_total)}</span>
      </div>
      {flagged && (
        <p className="mt-1 flex items-center gap-1 font-medium text-red-600">
          <AlertTriangle className="h-3.5 w-3.5" />
          Payout exceeds what this account has funded and earned.
        </p>
      )}
    </div>
  );
};

const FILTERS = ["all", "pending", "completed", "rejected"] as const;
type Filter = (typeof FILTERS)[number];
const FILTER_LABELS: Record<Filter, string> = {
  all: "All",
  pending: "Pending",
  completed: "Paid",
  rejected: "Declined",
};

const statusBadge = (status: string) => {
  if (status === "pending")
    return (
      <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-600">
        Pending
      </Badge>
    );
  if (status === "completed" || status === "approved")
    return (
      <Badge variant="outline" className="border-green-500/20 bg-green-500/10 text-green-600">
        Paid
      </Badge>
    );
  if (status === "rejected" || status === "declined" || status === "failed")
    return (
      <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-red-600">
        Declined
      </Badge>
    );
  return <Badge variant="outline">{status}</Badge>;
};

const DEFAULTS: LiveSettings = {
  enabled: true,
  fee_pct: 0.1,
  min_order_usd: 10,
  min_funding_usd: 10,
  min_withdrawal_usd: 10,
  withdrawal_fee_pct: 1,
  withdrawal_fee_min: 1,
};

export const AdminLiveTrading = ({
  reloadMembers,
  onPendingCount,
}: {
  reloadMembers?: () => void;
  onPendingCount?: (n: number) => void;
}) => {
  const [settings, setSettings] = useState<LiveSettings>(DEFAULTS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [accounts, setAccounts] = useState<LiveAccountRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<LiveAccountRow | null>(null);
  const [pnl, setPnl] = useState<PnlRow[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [memberTrades, setMemberTrades] = useState<Record<string, MemberTrade[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: setting }, { data: accs, error: accErr }, { data: wds }, { data: pnlRows }] =
      await Promise.all([
        db.from("app_settings").select("value").eq("key", "live_trading_settings").maybeSingle(),
        db.rpc("admin_list_live_accounts"),
        db
          .from("withdrawals")
          .select("id, user_id, amount, fee, wallet_address, status, notes, created_at")
          .like("notes", "Live trading%")
          .order("created_at", { ascending: false })
          .limit(150),
        db.rpc("admin_live_pnl_summary"),
      ]);

    if (setting?.value) {
      setSettings({ ...DEFAULTS, ...setting.value });
    } else {
      setSettings(DEFAULTS);
    }

    if (accErr) toast.error(accErr.message);
    setAccounts(
      (accs ?? []).map((a: any) => ({
        ...a,
        balance: num(a.balance),
        realized_pnl: num(a.realized_pnl),
        holdings_value: num(a.holdings_value),
        funded_total: num(a.funded_total),
        pending_withdrawals: num(a.pending_withdrawals),
      })),
    );
    setPnl(
      (pnlRows ?? []).map((p: any) => ({
        ...p,
        funded_total: num(p.funded_total),
        realized_pnl: num(p.realized_pnl),
        unrealized_pnl: num(p.unrealized_pnl),
        fees_total: num(p.fees_total),
        gross_profit: num(p.gross_profit),
        gross_loss: num(p.gross_loss),
        withdrawn_total: num(p.withdrawn_total),
        pending_withdrawal_total: num(p.pending_withdrawal_total),
        trades_count: num(p.trades_count),
      })),
    );
    setWithdrawals(
      (wds ?? []).map((w: any) => ({ ...w, amount: num(w.amount), fee: num(w.fee) })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pendingCount = useMemo(
    () => withdrawals.filter((w) => w.status === "pending").length,
    [withdrawals],
  );

  useEffect(() => {
    onPendingCount?.(pendingCount);
  }, [pendingCount, onPendingCount]);

  const totals = useMemo(() => {
    return accounts.reduce(
      (acc, a) => ({
        balance: acc.balance + a.balance,
        holdings: acc.holdings + a.holdings_value,
        pnl: acc.pnl + a.realized_pnl,
        funded: acc.funded + a.funded_total,
        openOrders: acc.openOrders + a.open_orders,
      }),
      { balance: 0, holdings: 0, pnl: 0, funded: 0, openOrders: 0 },
    );
  }, [accounts]);

  const pnlByUser = useMemo(() => {
    const map: Record<string, PnlRow> = {};
    pnl.forEach((p) => (map[p.user_id] = p));
    return map;
  }, [pnl]);

  const pnlTotals = useMemo(
    () =>
      pnl.reduce(
        (acc, p) => ({
          profit: acc.profit + p.gross_profit,
          loss: acc.loss + p.gross_loss,
          net: acc.net + p.realized_pnl + p.unrealized_pnl,
          fees: acc.fees + p.fees_total,
        }),
        { profit: 0, loss: 0, net: 0, fees: 0 },
      ),
    [pnl],
  );

  const visiblePnl = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pnl;
    return pnl.filter(
      (p) =>
        (p.display_name ?? "").toLowerCase().includes(q) || p.user_id.toLowerCase().includes(q),
    );
  }, [pnl, search]);

  const toggleExpanded = async (userId: string) => {
    if (expanded === userId) {
      setExpanded(null);
      return;
    }
    setExpanded(userId);
    if (!memberTrades[userId]) {
      const { data } = await db
        .from("live_trades")
        .select("id, symbol, side, qty, price, fee, pnl, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      setMemberTrades((m) => ({
        ...m,
        [userId]: (data ?? []).map((t: any) => ({
          ...t,
          qty: num(t.qty),
          price: num(t.price),
          fee: num(t.fee),
          pnl: num(t.pnl),
        })),
      }));
    }
  };

  const visibleAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        (a.display_name ?? "").toLowerCase().includes(q) || a.user_id.toLowerCase().includes(q),
    );
  }, [accounts, search]);

  const visibleWithdrawals = useMemo(
    () => (filter === "all" ? withdrawals : withdrawals.filter((w) => w.status === filter)),
    [withdrawals, filter],
  );

  const after = () => {
    load();
    reloadMembers?.();
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    const { error } = await db.rpc("admin_set_live_settings", {
      _settings: {
        enabled: settings.enabled,
        fee_pct: Number(settings.fee_pct),
        min_order_usd: Number(settings.min_order_usd),
        min_funding_usd: Number(settings.min_funding_usd),
        min_withdrawal_usd: Number(settings.min_withdrawal_usd),
        withdrawal_fee_pct: Number(settings.withdrawal_fee_pct),
        withdrawal_fee_min: Number(settings.withdrawal_fee_min),
      },
    });
    setSavingSettings(false);
    if (error) return toast.error(error.message);
    toast.success("Live trading rules saved");
    load();
  };

  const adjustBalance = async (userId: string, amount: number, reason: string) => {
    setBusy(userId);
    const { error } = await db.rpc("admin_adjust_live_balance", {
      _user_id: userId,
      _amount: amount,
      _reason: reason,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Live balance ${amount > 0 ? "credited" : "debited"}`);
    setSelected(null);
    after();
  };

  const setFreeze = async (userId: string, frozen: boolean, reason: string) => {
    setBusy(userId);
    const { error } = await db.rpc("admin_set_live_freeze", {
      _user_id: userId,
      _frozen: frozen,
      _reason: reason,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(frozen ? "Live trading frozen" : "Live trading unfrozen");
    setSelected(null);
    after();
  };

  const closeHoldings = async (userId: string) => {
    setBusy(userId);
    const { data, error } = await db.rpc("admin_close_live_holdings", { _user_id: userId });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Closed ${data?.closed ?? 0} position(s) for ${usd(num(data?.proceeds))}`);
    setSelected(null);
    after();
  };

  const decideWithdrawal = async (id: string, approve: boolean) => {
    const note = notes[id]?.trim();
    if (approve && !note) {
      toast.error("Enter the blockchain transaction hash in the note box first");
      return;
    }
    setBusy(id);
    const { error } = await supabase.functions.invoke("process-withdrawal", {
      body: approve
        ? { action: "approve-withdrawal", withdrawalId: id, transactionHash: note }
        : { action: "reject-withdrawal", withdrawalId: id, reason: note || "Rejected by admin" },
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(approve ? "Withdrawal approved" : "Withdrawal declined and refunded");
    after();
  };

  return (
    <div className="space-y-4">
      {/* Global rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              Live trading rules
            </span>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">Live trading {settings.enabled ? "open" : "closed"}</p>
              <p className="text-sm text-muted-foreground">
                When closed, members see a maintenance notice and new orders are rejected.
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, enabled: v }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ["fee_pct", "Trading fee (%)"],
                ["min_order_usd", "Minimum order ($)"],
                ["min_funding_usd", "Minimum card funding ($)"],
                ["min_withdrawal_usd", "Minimum withdrawal ($)"],
                ["withdrawal_fee_pct", "Withdrawal fee (%)"],
                ["withdrawal_fee_min", "Minimum withdrawal fee ($)"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`live-${key}`}>{label}</Label>
                <Input
                  id={`live-${key}`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings[key] as number}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, [key]: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {settings.updated_at
                ? `Last changed ${new Date(settings.updated_at).toLocaleString()}`
                : "Using the platform defaults"}
            </p>
            <Button onClick={saveSettings} disabled={savingSettings}>
              {savingSettings ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save rules
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Live balances", usd(totals.balance)],
          ["Open positions value", usd(totals.holdings)],
          ["Realised P&L", usd(totals.pnl)],
          ["Total funded", usd(totals.funded)],
          ["Open orders", String(totals.openOrders)],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-1 text-lg font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Profit & loss review */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Profit &amp; loss review
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Total profit", usd(pnlTotals.profit), "text-green-600"],
              ["Total loss", usd(pnlTotals.loss), "text-red-600"],
              ["Net profit / loss", usd(pnlTotals.net), pnlTotals.net >= 0 ? "text-green-600" : "text-red-600"],
              ["Fees collected", usd(pnlTotals.fees), ""],
            ].map(([label, value, cls]) => (
              <div key={label} className="rounded-lg border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className={`mt-1 text-lg font-semibold ${cls}`}>{value}</p>
              </div>
            ))}
          </div>

          <p className="text-sm text-muted-foreground">
            Check a member's profit and loss here before approving any balance or withdrawal.
          </p>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Funded</TableHead>
                  <TableHead>Realised</TableHead>
                  <TableHead>Unrealised</TableHead>
                  <TableHead>Net position</TableHead>
                  <TableHead>Withdrawn</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Verdict</TableHead>
                  <TableHead className="text-right">Trades</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visiblePnl.map((p) => (
                  <>
                    <TableRow key={p.user_id}>
                      <TableCell>
                        <p className="font-medium">{p.display_name || "Unnamed member"}</p>
                        {payoutExceedsEarnings(p) && (
                          <p className="flex items-center gap-1 text-xs font-medium text-red-600">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Payout above earnings
                          </p>
                        )}
                      </TableCell>
                      <TableCell>{usd(p.funded_total)}</TableCell>
                      <TableCell className={p.realized_pnl >= 0 ? "text-green-600" : "text-red-600"}>
                        {usd(p.realized_pnl)}
                      </TableCell>
                      <TableCell
                        className={p.unrealized_pnl >= 0 ? "text-green-600" : "text-red-600"}
                      >
                        {usd(p.unrealized_pnl)}
                      </TableCell>
                      <TableCell className="font-medium">{usd(netPosition(p))}</TableCell>
                      <TableCell>{usd(p.withdrawn_total)}</TableCell>
                      <TableCell>{usd(p.pending_withdrawal_total)}</TableCell>
                      <TableCell>{verdictBadge(p)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleExpanded(p.user_id)}
                        >
                          {p.trades_count}
                          <ChevronDown
                            className={`ml-1 h-4 w-4 transition-transform ${
                              expanded === p.user_id ? "rotate-180" : ""
                            }`}
                          />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expanded === p.user_id && (
                      <TableRow key={`${p.user_id}-detail`}>
                        <TableCell colSpan={9} className="bg-muted/30">
                          {(memberTrades[p.user_id] ?? []).length === 0 ? (
                            <p className="py-2 text-sm text-muted-foreground">No trades recorded.</p>
                          ) : (
                            <div className="space-y-1 py-1 text-xs">
                              {(memberTrades[p.user_id] ?? []).map((t) => (
                                <div key={t.id} className="flex flex-wrap gap-x-4">
                                  <span className="font-medium uppercase">{t.side}</span>
                                  <span>{t.symbol}</span>
                                  <span>{t.qty}</span>
                                  <span>@ {usd(t.price)}</span>
                                  <span>fee {usd(t.fee)}</span>
                                  <span className={t.pnl >= 0 ? "text-green-600" : "text-red-600"}>
                                    {usd(t.pnl)}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {new Date(t.created_at).toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
                {!loading && visiblePnl.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      No live trading profit or loss to review yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Activity monitor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Live accounts ({accounts.length})
            </span>
            <Input
              placeholder="Search member"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64"
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Positions</TableHead>
                  <TableHead>Realised P&L</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Trades</TableHead>
                  <TableHead>Funded</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Manage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleAccounts.map((a) => (
                  <TableRow key={a.user_id}>
                    <TableCell>
                      <p className="font-medium">{a.display_name || "Unnamed member"}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.last_trade_at
                          ? `Last trade ${new Date(a.last_trade_at).toLocaleDateString()}`
                          : "No trades yet"}
                      </p>
                    </TableCell>
                    <TableCell>{usd(a.balance)}</TableCell>
                    <TableCell>{usd(a.holdings_value)}</TableCell>
                    <TableCell className={a.realized_pnl >= 0 ? "text-green-600" : "text-red-600"}>
                      {usd(a.realized_pnl)}
                    </TableCell>
                    <TableCell>{a.open_orders}</TableCell>
                    <TableCell>{a.trades_count}</TableCell>
                    <TableCell>{usd(a.funded_total)}</TableCell>
                    <TableCell>
                      {a.frozen ? (
                        <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-red-600">
                          Frozen
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-green-500/20 bg-green-500/10 text-green-600">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelected(a)}>
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && visibleAccounts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      No live trading accounts yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5 text-primary" />
              Live trading withdrawals{pendingCount > 0 ? ` (${pendingCount} pending)` : ""}
            </span>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? "default" : "outline"}
                  onClick={() => setFilter(f)}
                >
                  {FILTER_LABELS[f]}
                </Button>
              ))}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibleWithdrawals.map((w) => {
            const member = accounts.find((a) => a.user_id === w.user_id);
            return (
              <div key={w.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {usd(w.amount)}{" "}
                      <span className="text-sm text-muted-foreground">fee {usd(w.fee)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member?.display_name || w.user_id} · {new Date(w.created_at).toLocaleString()}
                    </p>
                    <p className="mt-1 break-all text-xs text-muted-foreground">
                      {w.wallet_address}
                    </p>
                  </div>
                  {statusBadge(w.status)}
                </div>
                <MemberPnlSummary pnl={pnlByUser[w.user_id]} />
                {w.status === "pending" && (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Input
                      placeholder="Transaction hash (approve) or reason (decline)"
                      value={notes[w.id] ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [w.id]: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => decideWithdrawal(w.id, true)}
                        disabled={busy === w.id}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => decideWithdrawal(w.id, false)}
                        disabled={busy === w.id}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {!loading && visibleWithdrawals.length === 0 && (
            <p className="py-6 text-center text-muted-foreground">No withdrawals to show.</p>
          )}
        </CardContent>
      </Card>

      <MemberControls
        account={selected}
        busy={busy === selected?.user_id}
        onClose={() => setSelected(null)}
        onAdjust={adjustBalance}
        onFreeze={setFreeze}
        onCloseHoldings={closeHoldings}
      />
    </div>
  );
};

const MemberControls = ({
  account,
  busy,
  onClose,
  onAdjust,
  onFreeze,
  onCloseHoldings,
}: {
  account: LiveAccountRow | null;
  busy: boolean;
  onClose: () => void;
  onAdjust: (userId: string, amount: number, reason: string) => void;
  onFreeze: (userId: string, frozen: boolean, reason: string) => void;
  onCloseHoldings: (userId: string) => void;
}) => {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    setAmount("");
    setReason("");
  }, [account?.user_id]);

  if (!account) return null;
  const value = parseFloat(amount) || 0;

  return (
    <Dialog open={!!account} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{account.display_name || "Live account"}</DialogTitle>
          <DialogDescription>
            Balance {usd(account.balance)} · positions {usd(account.holdings_value)} · realised{" "}
            {usd(account.realized_pnl)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2 rounded-lg border p-3">
            <Label htmlFor="live-adjust-amount">Adjust live balance</Label>
            <Input
              id="live-adjust-amount"
              type="number"
              step="0.01"
              placeholder="Amount in USD"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Input
              placeholder="Reason (kept in the audit log)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={busy || value <= 0}
                onClick={() => onAdjust(account.user_id, Math.abs(value), reason || "Admin credit")}
              >
                Credit {value > 0 ? usd(value) : ""}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy || value <= 0}
                onClick={() => onAdjust(account.user_id, -Math.abs(value), reason || "Admin debit")}
              >
                Debit {value > 0 ? usd(value) : ""}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">
                {account.frozen ? "Live trading is frozen" : "Live trading is active"}
              </p>
              {account.frozen_reason && (
                <p className="text-xs text-muted-foreground">{account.frozen_reason}</p>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                onFreeze(account.user_id, !account.frozen, reason || "Admin decision")
              }
            >
              {account.frozen ? (
                <>
                  <Unlock className="mr-2 h-4 w-4" />
                  Unfreeze
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Freeze
                </>
              )}
            </Button>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Force-close positions</p>
              <p className="text-xs text-muted-foreground">
                Sells every holding at the current market price and cancels open orders.
              </p>
            </div>
            <Button
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => onCloseHoldings(account.user_id)}
            >
              <XOctagon className="mr-2 h-4 w-4" />
              Close all
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminLiveTrading;
