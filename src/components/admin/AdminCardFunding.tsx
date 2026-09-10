import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { RefreshCw, Check, X, Wallet } from "lucide-react";

interface Row {
  id: string;
  user_id: string;
  card_id: string;
  amount_usd: number;
  coin_symbol: string;
  network: string;
  deposit_address: string;
  tx_hash: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
}

const usd = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const tone = (s: string) =>
  s === "credited"
    ? "border-emerald-500/40 text-emerald-500"
    : s === "rejected"
    ? "border-destructive/40 text-destructive"
    : "border-amber-500/40 text-amber-500";

export const AdminCardFunding = ({ onChanged }: { onChanged?: () => void }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("card_funding_requests")
      .select(
        "id, user_id, card_id, amount_usd, coin_symbol, network, deposit_address, tx_hash, status, admin_note, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    setRows(((data ?? []) as any[]).map((r) => ({ ...r, amount_usd: Number(r.amount_usd) })));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (id: string, approve: boolean) => {
    setBusy(id);
    const { data, error } = await supabase.rpc("admin_credit_card_funding", {
      _request_id: id,
      _approve: approve,
      _note: notes[id]?.trim() || null,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    const res = data as any;
    toast.success(
      approve
        ? res?.activated
          ? "Credited — card activated"
          : "Funding credited to card balance"
        : "Funding request rejected"
    );
    setNotes((n) => ({ ...n, [id]: "" }));
    await load();
    onChanged?.();
  };

  return (
    <div className="mb-6 rounded-xl border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Wallet className="h-4 w-4 text-primary" /> Card funding (USDT TRC20)
        </p>
        <Button size="sm" variant="outline" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Submitted</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Network</TableHead>
              <TableHead>Tx hash</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Note / actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No card funding requests yet
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-xs">{r.user_id.slice(0, 8)}…</TableCell>
                  <TableCell className="text-xs font-semibold tabular-nums">
                    ${usd(r.amount_usd)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.coin_symbol}
                    <div className="text-muted-foreground">{r.network}</div>
                  </TableCell>
                  <TableCell className="max-w-[140px] truncate font-mono text-xs">
                    {r.tx_hash ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={tone(r.status)}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {r.status === "pending" ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          placeholder="Note (optional)"
                          className="h-8 w-40 text-xs"
                          value={notes[r.id] ?? ""}
                          onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                        />
                        <Button size="sm" disabled={busy === r.id} onClick={() => act(r.id, true)}>
                          <Check className="mr-1 h-3.5 w-3.5" /> Credit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          disabled={busy === r.id}
                          onClick={() => act(r.id, false)}
                        >
                          <X className="mr-1 h-3.5 w-3.5" /> Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">{r.admin_note ?? "—"}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminCardFunding;
