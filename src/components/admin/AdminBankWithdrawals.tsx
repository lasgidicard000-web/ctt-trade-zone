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
import { Landmark, RefreshCw } from "lucide-react";

interface Row {
  id: string;
  user_id: string;
  amount_usd: number;
  status: string;
  admin_note: string | null;
  created_at: string;
  card_bank_accounts: {
    holder_name: string;
    bank_name: string;
    account_masked: string;
  } | null;
}

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

const statusBadge = (status: string) => {
  if (status === "pending")
    return (
      <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-600">
        Pending
      </Badge>
    );
  if (status === "paid")
    return (
      <Badge variant="outline" className="border-green-500/20 bg-green-500/10 text-green-600">
        Paid
      </Badge>
    );
  return (
    <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-red-600">
      Declined
    </Badge>
  );
};

export const AdminBankWithdrawals = ({ reloadMembers }: { reloadMembers?: () => void }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("card_bank_withdrawals" as any)
      .select(
        "id, user_id, amount_usd, status, admin_note, created_at, card_bank_accounts(holder_name, bank_name, account_masked)"
      )
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows(((data ?? []) as any[]).map((r) => ({ ...r, amount_usd: Number(r.amount_usd) })) as Row[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (id: string, approve: boolean) => {
    setBusy(id);
    const { data, error } = await supabase.rpc("admin_decide_bank_withdrawal" as any, {
      _withdrawal_id: id,
      _approve: approve,
      _note: notes[id]?.trim() || null,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    const res = data as any;
    if (res && res.ok === false) return toast.error(`Could not complete: ${res.reason}`);
    toast.success(approve ? "Bank transfer marked paid" : "Request declined and amount released");
    load();
    reloadMembers?.();
  };

  const pending = rows.filter((r) => r.status === "pending").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <Landmark className="h-4 w-4 text-primary" />
          Bank withdrawals (simulated)
          <Badge variant="outline">{pending} pending</Badge>
          <Button size="sm" variant="outline" className="ml-auto" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Bank details</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Note / Action</TableHead>
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
                    No bank withdrawal requests yet
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
                      <span className="font-medium">{r.card_bank_accounts?.bank_name ?? "—"}</span>
                      <div className="text-muted-foreground">
                        {r.card_bank_accounts?.holder_name} · {r.card_bank_accounts?.account_masked}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">
                      {usd(r.amount_usd)}
                    </TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell>
                      {r.status === "pending" ? (
                        <div className="flex flex-wrap items-center gap-1">
                          <Input
                            value={notes[r.id] ?? ""}
                            onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                            placeholder="Optional note"
                            className="h-8 w-40 text-xs"
                          />
                          <Button size="sm" disabled={busy === r.id} onClick={() => decide(r.id, true)}>
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            disabled={busy === r.id}
                            onClick={() => decide(r.id, false)}
                          >
                            Decline
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {r.admin_note || "No note"}
                        </span>
                      )}
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

export default AdminBankWithdrawals;
