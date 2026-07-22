import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Download, Edit, Undo2, Trash2, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { ManualBalanceAdjustment } from "@/components/admin/ManualBalanceAdjustment";

type Kind = "transactions" | "withdrawals" | "deposit_history" | "crypto_payments";

interface UnifiedRow {
  kind: Kind;
  id: string;
  user_id: string;
  created_at: string;
  type: string;
  coin: string;
  amount: number;
  status: string;
  hash: string | null;
  notes: string | null;
  raw: any;
}

const statusVariants: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  completed: "bg-green-500/10 text-green-600 border-green-500/20",
  confirmed: "bg-green-500/10 text-green-600 border-green-500/20",
  rejected: "bg-red-500/10 text-red-600 border-red-500/20",
  cancelled: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  reversed: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  failed: "bg-red-500/10 text-red-600 border-red-500/20",
};

const StatusBadge = ({ s }: { s: string }) => (
  <Badge variant="outline" className={statusVariants[s] ?? ""}>{s}</Badge>
);

interface AuditRow {
  id: string;
  created_at: string;
  admin_user_id: string;
  target_user_id: string | null;
  before: any;
  after: any;
  reason: string | null;
}

export const AdminTransactions = () => {
  const [rows, setRows] = useState<UnifiedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | Kind | "audit">("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [coinFilter, setCoinFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [editRow, setEditRow] = useState<UnifiedRow | null>(null);
  const [statusRow, setStatusRow] = useState<UnifiedRow | null>(null);
  const [reverseRow, setReverseRow] = useState<UnifiedRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<UnifiedRow | null>(null);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditLoaded, setAuditLoaded] = useState(false);
  const [directionFilter, setDirectionFilter] = useState<"all" | "credit" | "debit">("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    const [tx, wd, dh, cp] = await Promise.all([
      supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(300),
      supabase.from("withdrawals" as any).select("*").order("created_at", { ascending: false }).limit(300),
      supabase.from("deposit_history").select("*").order("created_at", { ascending: false }).limit(300),
      supabase.from("crypto_payments" as any).select("*").order("created_at", { ascending: false }).limit(300),
    ]);

    const list: UnifiedRow[] = [];
    (tx.data ?? []).forEach((r: any) => list.push({
      kind: "transactions", id: r.id, user_id: r.user_id, created_at: r.created_at,
      type: r.type, coin: r.to_symbol || r.from_symbol || "-", amount: Number(r.amount),
      status: r.status, hash: null, notes: r.notes ?? null, raw: r,
    }));
    (wd.data ?? []).forEach((r: any) => list.push({
      kind: "withdrawals", id: r.id, user_id: r.user_id, created_at: r.created_at,
      type: "withdrawal", coin: "USDT", amount: Number(r.amount),
      status: r.status, hash: r.transaction_hash, notes: r.notes, raw: r,
    }));
    (dh.data ?? []).forEach((r: any) => list.push({
      kind: "deposit_history", id: r.id, user_id: r.user_id, created_at: r.created_at,
      type: "deposit", coin: r.coin_symbol, amount: Number(r.amount),
      status: r.confirmation_status, hash: r.transaction_hash, notes: r.notes, raw: r,
    }));
    (cp.data ?? []).forEach((r: any) => list.push({
      kind: "crypto_payments", id: r.id, user_id: r.user_id, created_at: r.created_at,
      type: "crypto_payment", coin: r.pay_currency?.toUpperCase() ?? "-", amount: Number(r.pay_amount),
      status: r.payment_status, hash: null, notes: null, raw: r,
    }));
    list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    setRows(list);
    setLoading(false);
  };

  const loadAudit = async () => {
    setAuditLoading(true);
    const { data, error } = await supabase
      .from("admin_transaction_log" as any)
      .select("*")
      .eq("action", "adjust-balance")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      toast.error(error.message);
    } else {
      setAuditRows((data as any) ?? []);
      setAuditLoaded(true);
    }
    setAuditLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (tab === "audit" && !auditLoaded) loadAudit();
  }, [tab, auditLoaded]);

  const filteredAudit = useMemo(() => auditRows.filter((r) => {
    const dir = r.after?.direction as string | undefined;
    if (directionFilter !== "all" && dir !== directionFilter) return false;
    if (userFilter && !(r.target_user_id ?? "").toLowerCase().includes(userFilter.toLowerCase())) return false;
    if (from && new Date(r.created_at) < new Date(from)) return false;
    if (to && new Date(r.created_at) > new Date(to + "T23:59:59")) return false;
    return true;
  }), [auditRows, directionFilter, userFilter, from, to]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (tab !== "all" && r.kind !== tab) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (coinFilter !== "all" && r.coin !== coinFilter) return false;
    if (userFilter && !r.user_id.toLowerCase().includes(userFilter.toLowerCase())) return false;
    if (from && new Date(r.created_at) < new Date(from)) return false;
    if (to && new Date(r.created_at) > new Date(to + "T23:59:59")) return false;
    return true;
  }), [rows, tab, statusFilter, coinFilter, userFilter, from, to]);

  const uniqueStatuses = useMemo(() => Array.from(new Set(rows.map((r) => r.status))), [rows]);
  const uniqueCoins = useMemo(() => Array.from(new Set(rows.map((r) => r.coin))), [rows]);

  const invoke = async (action: string, payload: any) => {
    const { data, error } = await supabase.functions.invoke("admin-transactions", { body: { action, payload } });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    return data;
  };

  const exportCsv = () => {
    if (tab === "audit") {
      const header = ["date", "admin_user_id", "target_user_id", "coin", "direction", "amount", "btc_before", "btc_after", "usdt_before", "usdt_after", "reason"];
      const lines = [header.join(",")].concat(
        filteredAudit.map((r) => {
          const b = r.before ?? {}; const a = r.after ?? {};
          return [
            r.created_at, r.admin_user_id, r.target_user_id ?? "",
            a.coin ?? "", a.direction ?? "", a.amount ?? "",
            b.btc ?? "", a.btc ?? "", b.usdt ?? "", a.usdt ?? "",
            (r.reason ?? "").replace(/[\n,]/g, " "),
          ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
        }),
      );
      const blob = new Blob([lines.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `audit-log-${Date.now()}.csv`; a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const header = ["date", "kind", "id", "user_id", "type", "coin", "amount", "status", "hash", "notes"];
    const lines = [header.join(",")].concat(
      filtered.map((r) => [
        r.created_at, r.kind, r.id, r.user_id, r.type, r.coin, r.amount, r.status,
        r.hash ?? "", (r.notes ?? "").replace(/[\n,]/g, " "),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `transactions-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const doRefresh = () => { load(); if (tab === "audit") loadAudit(); };

  const fmtBtc = (v: any) => (v == null || v === "" ? "—" : Number(v).toFixed(8));
  const fmtUsdt = (v: any) => (v == null || v === "" ? "—" : Number(v).toFixed(2));

  return (
    <div className="space-y-4">
      <ManualBalanceAdjustment onDone={load} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>All Transactions</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={doRefresh}>
                <RefreshCw className="mr-1 h-3 w-3" /> Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <Download className="mr-1 h-3 w-3" /> Export CSV
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-5">
            {tab !== "audit" ? (
              <>
                <div><Label className="text-xs">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {uniqueStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Coin</Label>
                  <Select value={coinFilter} onValueChange={setCoinFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {uniqueCoins.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div><Label className="text-xs">Direction</Label>
                <Select value={directionFilter} onValueChange={(v) => setDirectionFilter(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                    <SelectItem value="debit">Debit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div><Label className="text-xs">User ID contains</Label>
              <Input value={userFilter} onChange={(e) => setUserFilter(e.target.value)} placeholder="uuid fragment" />
            </div>
            <div><Label className="text-xs">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div><Label className="text-xs">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="all">All ({rows.length})</TabsTrigger>
              <TabsTrigger value="deposit_history">Deposits</TabsTrigger>
              <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
              <TabsTrigger value="transactions">Internal</TabsTrigger>
              <TabsTrigger value="crypto_payments">Crypto Pay</TabsTrigger>
              <TabsTrigger value="audit">Audit</TabsTrigger>
            </TabsList>

            <TabsContent value={tab} className="mt-4">
              {tab === "audit" ? (
                <>
                  <div className="text-xs text-muted-foreground mb-2">
                    {filteredAudit.length} manual adjustment{filteredAudit.length === 1 ? "" : "s"}
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Admin</TableHead>
                          <TableHead>Target user</TableHead>
                          <TableHead>Coin</TableHead>
                          <TableHead>Direction</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>BTC before → after</TableHead>
                          <TableHead>USDT before → after</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLoading ? (
                          <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
                        ) : filteredAudit.length === 0 ? (
                          <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No manual adjustments recorded.</TableCell></TableRow>
                        ) : filteredAudit.map((r) => {
                          const b = r.before ?? {}; const a = r.after ?? {};
                          const dir = a.direction as string | undefined;
                          const isOpen = !!expanded[r.id];
                          return (
                            <Fragment key={r.id}>
                              <TableRow
                                key={r.id}
                                className="cursor-pointer"
                                onClick={() => setExpanded((s) => ({ ...s, [r.id]: !s[r.id] }))}
                              >
                                <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</TableCell>
                                <TableCell className="font-mono text-xs">{r.admin_user_id?.slice(0, 8)}…</TableCell>
                                <TableCell className="font-mono text-xs">{r.target_user_id?.slice(0, 8) ?? "—"}…</TableCell>
                                <TableCell>{a.coin ?? "—"}</TableCell>
                                <TableCell>
                                  {dir === "credit" ? (
                                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">credit</Badge>
                                  ) : dir === "debit" ? (
                                    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">debit</Badge>
                                  ) : "—"}
                                </TableCell>
                                <TableCell className="font-mono">{a.amount ?? "—"}</TableCell>
                                <TableCell className="font-mono text-xs whitespace-nowrap">
                                  {fmtBtc(b.btc)} → {fmtBtc(a.btc)}
                                </TableCell>
                                <TableCell className="font-mono text-xs whitespace-nowrap">
                                  {fmtUsdt(b.usdt)} → {fmtUsdt(a.usdt)}
                                </TableCell>
                                <TableCell className="max-w-[240px] truncate text-xs" title={r.reason ?? ""}>
                                  {r.reason ?? "—"}
                                </TableCell>
                              </TableRow>
                              {isOpen && (
                                <TableRow key={`${r.id}-detail`}>
                                  <TableCell colSpan={9} className="bg-muted/40">
                                    <div className="grid gap-3 md:grid-cols-2 text-xs">
                                      <div>
                                        <div className="font-semibold mb-1">Before</div>
                                        <pre className="whitespace-pre-wrap font-mono">{JSON.stringify(b, null, 2)}</pre>
                                      </div>
                                      <div>
                                        <div className="font-semibold mb-1">After</div>
                                        <pre className="whitespace-pre-wrap font-mono">{JSON.stringify(a, null, 2)}</pre>
                                      </div>
                                      <div className="md:col-span-2">
                                        <div className="font-semibold mb-1">Full reason</div>
                                        <div className="whitespace-pre-wrap">{r.reason ?? "—"}</div>
                                      </div>
                                      <div className="md:col-span-2 text-muted-foreground">
                                        Admin: <span className="font-mono">{r.admin_user_id}</span> · Target: <span className="font-mono">{r.target_user_id ?? "—"}</span>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-xs text-muted-foreground mb-2">{filtered.length} rows</div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Coin</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                          <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No rows</TableCell></TableRow>
                        ) : filtered.map((r) => (
                          <TableRow key={`${r.kind}-${r.id}`}>
                            <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</TableCell>
                            <TableCell className="text-xs">{r.kind}</TableCell>
                            <TableCell className="font-mono text-xs">{r.user_id.slice(0, 8)}…</TableCell>
                            <TableCell className="capitalize text-xs">{r.type}</TableCell>
                            <TableCell>{r.coin}</TableCell>
                            <TableCell className="font-mono">{r.amount}</TableCell>
                            <TableCell><StatusBadge s={r.status} /></TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                <Button size="sm" variant="outline" onClick={() => setEditRow(r)}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setStatusRow(r)}>
                                  Status
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setReverseRow(r)}>
                                  <Undo2 className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => setDeleteRow(r)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {editRow && (
        <EditDialog row={editRow} onClose={() => setEditRow(null)} onSaved={() => { setEditRow(null); load(); }} invoke={invoke} />
      )}
      {statusRow && (
        <StatusDialog row={statusRow} onClose={() => setStatusRow(null)} onSaved={() => { setStatusRow(null); load(); }} invoke={invoke} />
      )}
      {reverseRow && (
        <ConfirmDialog
          title="Reverse transaction"
          desc="This will reverse the wallet impact and mark the row as reversed. This action is audited."
          row={reverseRow}
          onClose={() => setReverseRow(null)}
          onConfirm={async (reason) => {
            await invoke("reverse", { target_table: reverseRow.kind, target_id: reverseRow.id, reason });
            toast.success("Reversed");
            setReverseRow(null); load();
          }}
        />
      )}
      {deleteRow && (
        <ConfirmDialog
          title="Delete transaction"
          desc="Hard-delete this row. Pending withdrawals refund USDT automatically."
          row={deleteRow}
          destructive
          onClose={() => setDeleteRow(null)}
          onConfirm={async (reason) => {
            await invoke("delete", { target_table: deleteRow.kind, target_id: deleteRow.id, reason });
            toast.success("Deleted");
            setDeleteRow(null); load();
          }}
        />
      )}
    </div>
  );
};

const EditDialog = ({ row, onClose, onSaved, invoke }: {
  row: UnifiedRow; onClose: () => void; onSaved: () => void;
  invoke: (a: string, p: any) => Promise<any>;
}) => {
  const [amount, setAmount] = useState(String(row.amount));
  const [hash, setHash] = useState(row.hash ?? "");
  const [notes, setNotes] = useState(row.notes ?? "");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await invoke("edit", {
        target_table: row.kind, target_id: row.id,
        amount, transaction_hash: hash, notes,
      });
      toast.success("Saved");
      onSaved();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit {row.kind}</DialogTitle>
          <DialogDescription>Update amount, hash, or notes.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div><Label>Amount</Label><Input value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          {row.kind !== "transactions" && row.kind !== "crypto_payments" && (
            <div><Label>Transaction hash</Label><Input value={hash} onChange={(e) => setHash(e.target.value)} /></div>
          )}
          <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
          <Button onClick={save} disabled={busy} className="w-full">{busy ? "Saving…" : "Save"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const StatusDialog = ({ row, onClose, onSaved, invoke }: {
  row: UnifiedRow; onClose: () => void; onSaved: () => void;
  invoke: (a: string, p: any) => Promise<any>;
}) => {
  const options = row.kind === "deposit_history"
    ? ["pending", "confirmed", "failed", "reversed"]
    : row.kind === "crypto_payments"
    ? ["waiting", "confirming", "confirmed", "finished", "failed", "expired"]
    : ["pending", "completed", "rejected", "cancelled", "reversed"];
  const [status, setStatus] = useState(row.status);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await invoke("set-status", { target_table: row.kind, target_id: row.id, status, reason });
      toast.success("Status updated");
      onSaved();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  const isRefund = row.kind === "withdrawals" && row.status === "pending" && (status === "rejected" || status === "cancelled");
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change status</DialogTitle>
          <DialogDescription>
            {isRefund ? "Rejecting/cancelling a pending withdrawal will refund USDT." : "Set a new status for this row."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Reason / note</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} /></div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={busy} className="flex-1">
              {status === "completed" || status === "confirmed" ? <CheckCircle className="mr-1 h-4 w-4" /> : <XCircle className="mr-1 h-4 w-4" />}
              {busy ? "Saving…" : "Apply"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ConfirmDialog = ({ title, desc, row, destructive, onClose, onConfirm }: {
  title: string; desc: string; row: UnifiedRow; destructive?: boolean;
  onClose: () => void; onConfirm: (reason: string) => Promise<void>;
}) => {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{desc}</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="rounded bg-muted p-3 text-xs font-mono">
            {row.kind} · {row.id.slice(0, 8)}… · {row.coin} {row.amount} · {row.status}
          </div>
          <div><Label>Reason</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} /></div>
          <Button variant={destructive ? "destructive" : "default"} disabled={busy}
            onClick={async () => { setBusy(true); try { await onConfirm(reason); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); } }}
            className="w-full">
            {busy ? "Working…" : "Confirm"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminTransactions;
