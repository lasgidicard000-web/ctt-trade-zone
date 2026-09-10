import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { RefreshCw, Users, Wallet, CreditCard, TrendingUp, ArrowUpRight, Store } from "lucide-react";

export interface AdminTotals {
  members: number;
  wallet_usd: number;
  card_balance_usd: number;
  active_plans: number;
  pending_funding: number;
  pending_merchant: number;
  pending_withdrawals: number;
}

interface Row {
  id: string;
  user_id: string;
  amount: number;
  label: string;
  detail: string;
  created_at: string;
}

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export const AdminOverview = ({
  totals,
  reloadMembers,
}: {
  totals: AdminTotals | null;
  reloadMembers: () => void;
}) => {
  const [funding, setFunding] = useState<Row[]>([]);
  const [merchant, setMerchant] = useState<Row[]>([]);
  const [liveWithdrawals, setLiveWithdrawals] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [f, m, w] = await Promise.all([
      supabase
        .from("card_funding_requests")
        .select("id, user_id, amount_usd, coin_symbol, network, tx_hash, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("merchant_payment_requests")
        .select("id, user_id, amount_usd, merchant, category, reference, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("withdrawals")
        .select("id, user_id, amount, wallet_address, notes, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);

    setFunding(
      (f.data ?? []).map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        amount: Number(r.amount_usd),
        label: `${r.coin_symbol} · ${r.network}`,
        detail: r.tx_hash ? `tx ${String(r.tx_hash).slice(0, 14)}…` : "no tx hash",
        created_at: r.created_at,
      }))
    );
    setMerchant(
      (m.data ?? []).map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        amount: Number(r.amount_usd),
        label: `${r.merchant} · ${r.category}`,
        detail: r.reference ?? "no reference",
        created_at: r.created_at,
      }))
    );
    setLiveWithdrawals(
      (w.data ?? [])
        .filter((r: any) => String(r.notes ?? "").startsWith("Live trading"))
        .map((r: any) => ({
          id: r.id,
          user_id: r.user_id,
          amount: Number(r.amount),
          label: String(r.wallet_address).slice(0, 18) + "…",
          detail: r.notes ?? "",
          created_at: r.created_at,
        }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const after = () => {
    load();
    reloadMembers();
  };

  const decideFunding = async (id: string, approve: boolean) => {
    setBusy(id);
    const { error } = await supabase.rpc("admin_credit_card_funding", {
      _request_id: id,
      _approve: approve,
      _note: notes[id]?.trim() || null,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(approve ? "Card credited" : "Funding request rejected");
    after();
  };

  const decideMerchant = async (id: string, approve: boolean) => {
    setBusy(id);
    const { error } = await supabase.rpc("admin_decide_merchant_payment", {
      _request_id: id,
      _approve: approve,
      _note: notes[id]?.trim() || null,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(approve ? "Payment approved" : "Payment declined and refunded");
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
    toast.success(approve ? "Withdrawal approved" : "Withdrawal rejected and refunded");
    after();
  };

  const stats = [
    { label: "Members", value: totals ? String(totals.members) : "—", icon: Users },
    { label: "Wallet value held", value: totals ? usd(totals.wallet_usd) : "—", icon: Wallet },
    { label: "Card balances", value: totals ? usd(totals.card_balance_usd) : "—", icon: CreditCard },
    { label: "Active plans", value: totals ? String(totals.active_plans) : "—", icon: TrendingUp },
  ];

  const queue = (
    title: string,
    icon: React.ElementType,
    rows: Row[],
    approveLabel: string,
    rejectLabel: string,
    onDecide: (id: string, approve: boolean) => void,
    notePlaceholder: string
  ) => {
    const Icon = icon;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="h-4 w-4 text-primary" />
            {title}
            <Badge variant="outline" className="ml-auto">{rows.length} pending</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nothing waiting
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">
                        {new Date(r.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.user_id.slice(0, 8)}…</TableCell>
                      <TableCell className="text-xs">
                        {r.label}
                        <div className="text-muted-foreground">{r.detail}</div>
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">
                        {usd(r.amount)}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={notes[r.id] ?? ""}
                          onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                          placeholder={notePlaceholder}
                          className="h-8 w-44 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            disabled={busy === r.id}
                            onClick={() => onDecide(r.id, true)}
                          >
                            {approveLabel}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            disabled={busy === r.id}
                            onClick={() => onDecide(r.id, false)}
                          >
                            {rejectLabel}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="rounded-lg bg-primary/10 p-2">
                <s.icon className="h-4 w-4 text-primary" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-semibold tabular-nums">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={after}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {queue(
        "Card funding requests",
        CreditCard,
        funding,
        "Credit",
        "Reject",
        decideFunding,
        "Optional note"
      )}
      {queue(
        "Merchant payment requests",
        Store,
        merchant,
        "Approve",
        "Decline",
        decideMerchant,
        "Optional note"
      )}
      {queue(
        "Live trading withdrawals",
        ArrowUpRight,
        liveWithdrawals,
        "Approve",
        "Reject",
        decideWithdrawal,
        "Tx hash / reason"
      )}
    </div>
  );
};

export default AdminOverview;
