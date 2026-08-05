import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Snowflake, Play, Trash2, RefreshCw, History, KeyRound, KeyOff } from "lucide-react";
import { CardSecurityLog } from "@/components/card/CardSecurityLog";
import { CardPinPolicy } from "@/components/admin/CardPinPolicy";
import { Fragment } from "react";


interface CardRow {
  id: string;
  user_id: string;
  last4: string;
  status: string;
  network: string;
  daily_limit: number;
  per_tx_limit: number;
  issued_at: string;
}

interface TxRow {
  card_id: string;
  amount_usd: number;
  status: string;
  created_at: string;
}

export const AdminCards = () => {
  const [cards, setCards] = useState<CardRow[]>([]);
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [openLog, setOpenLog] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: c }, { data: t }] = await Promise.all([
      supabase
        .from("virtual_cards")
        .select("id, user_id, last4, status, network, daily_limit, per_tx_limit, issued_at")
        .order("issued_at", { ascending: false }),
      supabase.from("card_transactions").select("card_id, amount_usd, status, created_at"),
    ]);
    setCards((c ?? []) as any);
    setTxs(((t ?? []) as any[]).map((r) => ({ ...r, amount_usd: Number(r.amount_usd) })));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const spend = useMemo(() => {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const map: Record<string, { today: number; total: number }> = {};
    for (const t of txs) {
      if (t.status !== "approved") continue;
      const e = (map[t.card_id] ??= { today: 0, total: 0 });
      e.total += t.amount_usd;
      if (new Date(t.created_at) >= midnight) e.today += t.amount_usd;
    }
    return map;
  }, [txs]);

  const act = async (id: string, status: "active" | "frozen" | "terminated") => {
    setBusy(id);
    const { error } = await supabase.rpc("set_card_status", {
      _card_id: id,
      _status: status,
      _reason: `Admin set card ${status}`,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Card ${status}`);
    load();
  };

  const badge = (s: string) =>
    s === "active"
      ? "border-emerald-500/40 text-emerald-500"
      : s === "frozen"
      ? "border-sky-500/40 text-sky-500"
      : s === "terminated"
      ? "border-destructive/40 text-destructive"
      : "border-amber-500/40 text-amber-500";

  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {cards.length} issued card{cards.length === 1 ? "" : "s"}
        </span>
        <Button size="sm" variant="outline" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Issued</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Card</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Limits</TableHead>
              <TableHead>Spend today</TableHead>
              <TableHead>Lifetime</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : cards.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No cards issued yet
                </TableCell>
              </TableRow>
            ) : (
              cards.map((c) => (
                <Fragment key={c.id}>
                <TableRow>

                  <TableCell className="text-xs">{new Date(c.issued_at).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-xs">{c.user_id.slice(0, 8)}…</TableCell>
                  <TableCell className="text-xs">
                    •••• {c.last4}
                    <div className="text-muted-foreground">{c.network}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={badge(c.status)}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    ${Number(c.daily_limit).toLocaleString()}/day
                    <div className="text-muted-foreground">
                      ${Number(c.per_tx_limit).toLocaleString()}/tx
                    </div>
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    ${(spend[c.id]?.today ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    ${(spend[c.id]?.total ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {c.status !== "active" && c.status !== "terminated" && (
                        <Button size="sm" variant="outline" disabled={busy === c.id} onClick={() => act(c.id, "active")}>
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {c.status === "active" && (
                        <Button size="sm" variant="outline" disabled={busy === c.id} onClick={() => act(c.id, "frozen")}>
                          <Snowflake className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {c.status === "frozen" && (
                        <Button size="sm" variant="outline" disabled={busy === c.id} onClick={() => act(c.id, "active")}>
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {c.status !== "terminated" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          disabled={busy === c.id}
                          onClick={() => act(c.id, "terminated")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setOpenLog(openLog === c.id ? null : c.id)}
                      >
                        <History className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {openLog === c.id && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <CardSecurityLog cardId={c.id} />
                    </TableCell>
                  </TableRow>
                )}
                </Fragment>

              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};
