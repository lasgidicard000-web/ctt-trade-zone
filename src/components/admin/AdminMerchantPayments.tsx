import { useCallback, useEffect, useMemo, useState } from "react";
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
import { RefreshCw, Store } from "lucide-react";

interface MerchantRow {
  id: string;
  user_id: string;
  merchant: string;
  category: string;
  amount_usd: number;
  reference: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  decided_at: string | null;
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
  if (status === "approved")
    return (
      <Badge variant="outline" className="border-green-500/20 bg-green-500/10 text-green-600">
        Paid
      </Badge>
    );
  if (status === "declined" || status === "rejected")
    return (
      <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-red-600">
        Declined
      </Badge>
    );
  return <Badge variant="outline">{status}</Badge>;
};

const FILTERS = ["all", "pending", "approved", "declined"] as const;
const FILTER_LABELS: Record<(typeof FILTERS)[number], string> = {
  all: "All",
  pending: "Pending",
  approved: "Paid",
  declined: "Declined",
};

export const AdminMerchantPayments = ({
  reloadMembers,
  onPendingCount,
}: {
  reloadMembers?: () => void;
  onPendingCount?: (n: number) => void;
}) => {
  const [rows, setRows] = useState<MerchantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("merchant_payment_requests")
      .select(
        "id, user_id, merchant, category, amount_usd, reference, status, admin_note, created_at, decided_at"
      )
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const mapped = (data ?? []).map((r: any) => ({
      ...r,
      amount_usd: Number(r.amount_usd),
    })) as MerchantRow[];
    setRows(mapped);
    onPendingCount?.(mapped.filter((r) => r.status === "pending").length);
  }, [onPendingCount]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (id: string, approve: boolean) => {
    setBusy(id);
    const { error } = await supabase.rpc("admin_decide_merchant_payment", {
      _request_id: id,
      _approve: approve,
      _note: notes[id]?.trim() || null,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(approve ? "Payment approved" : "Payment declined and refunded");
    load();
    reloadMembers?.();
  };

  const visible = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "declined")
      return rows.filter((r) => r.status === "declined" || r.status === "rejected");
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <Store className="h-4 w-4 text-primary" />
          Merchant payment requests
          <Badge variant="outline">{pendingCount} pending</Badge>
          <div className="ml-auto flex flex-wrap items-center gap-1">
            {FILTERS.map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "secondary" : "ghost"}
                onClick={() => setFilter(f)}
              >
                {FILTER_LABELS[f]}
              </Button>
            ))}
            <Button size="sm" variant="outline" onClick={load}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Note / Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No requests here
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">
                      {new Date(r.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.user_id.slice(0, 8)}…</TableCell>
                    <TableCell className="text-xs">
                      <span className="font-medium">{r.merchant}</span>
                      <div className="text-muted-foreground">{r.category}</div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs">
                      {r.reference || "—"}
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

export default AdminMerchantPayments;
