import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Clock, Loader2, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";

interface FmUpgrade {
  id: string;
  user_id: string;
  amount_usd: number;
  status: "pending" | "confirmed" | "rejected";
  note: string | null;
  admin_note: string | null;
  decided_at: string | null;
  created_at: string;
}

interface Props {
  onChanged?: () => void;
}

const usd = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusBadge = (status: FmUpgrade["status"]) =>
  status === "confirmed" ? (
    <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
      <CheckCircle2 className="mr-1 h-3 w-3" /> Confirmed
    </Badge>
  ) : status === "rejected" ? (
    <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
      <XCircle className="mr-1 h-3 w-3" /> Declined
    </Badge>
  ) : (
    <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
      <Clock className="mr-1 h-3 w-3" /> Pending
    </Badge>
  );

/**
 * Admin desk for Field Marshal premium dashboard upgrade requests ($500 BTC
 * deposit). Confirming credits the member's BTC balance like a manual deposit
 * (deposit history + transaction + admin audit log) and unlocks their premium
 * dashboard. Declining lets the member re-request.
 */
export const AdminFieldMarshalUpgrades = ({ onChanged }: Props) => {
  const [rows, setRows] = useState<FmUpgrade[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [declineTarget, setDeclineTarget] = useState<FmUpgrade | null>(null);
  const [declineNote, setDeclineNote] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<FmUpgrade | null>(null);
  const [confirming, setConfirming] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("field_marshal_upgrades")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const list = (data as FmUpgrade[]) ?? [];
    setRows(list);
    const ids = [...new Set(list.map((r) => r.user_id))];
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", ids);
      const map: Record<string, string> = {};
      (profs as { user_id: string; display_name: string | null }[])?.forEach((p) => {
        map[p.user_id] = p.display_name || "";
      });
      setNames(map);
    } else {
      setNames({});
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const confirmUpgrade = async () => {
    if (!confirmTarget) return;
    setConfirming(true);
    const row = confirmTarget;
    try {
      const me = (await supabase.auth.getUser()).data.user?.id;
      if (!me) throw new Error("Not signed in");

      const { data: priceRow } = await supabase
        .from("coin_prices")
        .select("price")
        .eq("symbol", "BTC")
        .maybeSingle();
      const btcPrice = priceRow?.price ? Number(priceRow.price) : 0;
      if (!btcPrice) throw new Error("BTC price unavailable");
      const btcAmount = Number((row.amount_usd / btcPrice).toFixed(8));

      const { error: updError } = await supabase
        .from("field_marshal_upgrades")
        .update({
          status: "confirmed",
          decided_at: new Date().toISOString(),
          decided_by: me,
        })
        .eq("id", row.id);
      if (updError) throw updError;

      // Credit the deposit to the member's BTC wallet balance.
      const { data: existing } = await supabase
        .from("wallet_balances")
        .select("id, balance")
        .eq("user_id", row.user_id)
        .eq("coin_symbol", "BTC")
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from("wallet_balances")
          .update({ balance: Number(existing.balance) + btcAmount })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("wallet_balances")
          .insert({ user_id: row.user_id, coin_symbol: "BTC", balance: btcAmount });
        if (error) throw error;
      }

      const depositNote = `Field Marshal premium upgrade deposit (${usd(row.amount_usd)}) — confirmed by admin`;
      const { error: dhError } = await supabase.from("deposit_history").insert({
        user_id: row.user_id,
        coin_symbol: "BTC",
        wallet_address: "bc1q76qphckpcegrj3qc5y57qr4vvs8p9hprlypsrk",
        amount: btcAmount,
        transaction_hash: row.note || null,
        confirmation_status: "confirmed",
        confirmations: 6,
        confirmed_at: new Date().toISOString(),
        notes: depositNote,
      });
      if (dhError) throw dhError;

      const { error: txError } = await supabase.from("transactions").insert({
        user_id: row.user_id,
        type: "deposit",
        to_symbol: "BTC",
        amount: btcAmount,
        status: "completed",
        notes: depositNote,
      });
      if (txError) throw txError;

      await supabase.from("admin_transaction_log").insert({
        admin_user_id: me,
        action: "confirm-fm-upgrade",
        target_table: "field_marshal_upgrades",
        target_id: row.id,
        target_user_id: row.user_id,
        before: { status: "pending" },
        after: { status: "confirmed", amount_usd: row.amount_usd, btc_amount: btcAmount },
        reason: "Field Marshal premium dashboard upgrade deposit confirmed",
      });

      toast.success("Upgrade confirmed", {
        description: "Deposit credited to the member's wallet and their premium dashboard is unlocked.",
      });
      setConfirmTarget(null);
      await fetchData();
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.message || "Could not confirm the upgrade");
      fetchData();
    } finally {
      setConfirming(false);
    }
  };

  const declineUpgrade = async () => {
    if (!declineTarget) return;
    setBusyId(declineTarget.id);
    const row = declineTarget;
    try {
      const me = (await supabase.auth.getUser()).data.user?.id;
      if (!me) throw new Error("Not signed in");
      const { error } = await supabase
        .from("field_marshal_upgrades")
        .update({
          status: "rejected",
          decided_at: new Date().toISOString(),
          decided_by: me,
          admin_note: declineNote.trim() || null,
        })
        .eq("id", row.id);
      if (error) throw error;
      await supabase.from("admin_transaction_log").insert({
        admin_user_id: me,
        action: "decline-fm-upgrade",
        target_table: "field_marshal_upgrades",
        target_id: row.id,
        target_user_id: row.user_id,
        before: { status: "pending" },
        after: { status: "rejected" },
        reason: declineNote.trim() || "Field Marshal upgrade deposit declined",
      });
      toast.success("Request declined", { description: "The member can submit a new request." });
      setDeclineTarget(null);
      setDeclineNote("");
      await fetchData();
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.message || "Could not decline the request");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          $500 BTC upgrade deposits that unlock the Field Marshal premium dashboard.
        </p>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading requests…</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No upgrade requests yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="rounded-lg border bg-card p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {names[row.user_id] || "Member"}{" "}
                    <span className="font-mono text-xs text-muted-foreground">
                      {row.user_id.slice(0, 8)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {usd(row.amount_usd)} upgrade deposit · submitted{" "}
                    {format(new Date(row.created_at), "d MMM yyyy, HH:mm")}
                  </p>
                </div>
                {statusBadge(row.status)}
              </div>
              {row.note && (
                <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                  Tx: {row.note}
                </p>
              )}
              {row.admin_note && (
                <p className="mt-2 text-xs text-muted-foreground">Admin note: {row.admin_note}</p>
              )}
              {row.decided_at && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Decided {format(new Date(row.decided_at), "d MMM yyyy, HH:mm")}
                </p>
              )}
              {row.status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => setConfirmTarget(row)}>
                    <ShieldCheck className="mr-1 h-4 w-4" /> Confirm deposit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeclineTarget(row)}
                    disabled={busyId === row.id}
                  >
                    {busyId === row.id ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="mr-1 h-4 w-4" />
                    )}{" "}
                    Decline
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm $500 upgrade deposit</DialogTitle>
            <DialogDescription>
              This credits the member's BTC wallet with the deposit amount at the current BTC price,
              records it in their deposit and transaction history, and unlocks their Field Marshal
              premium dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTarget(null)}>
              Cancel
            </Button>
            <Button onClick={confirmUpgrade} disabled={confirming}>
              {confirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm &amp; credit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!declineTarget} onOpenChange={(o) => !o && setDeclineTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline upgrade request</DialogTitle>
            <DialogDescription>
              The member will be able to submit a new request once a valid deposit is made.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={declineNote}
            onChange={(e) => setDeclineNote(e.target.value)}
            placeholder="Reason (optional, visible to the admin log)"
            maxLength={500}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={declineUpgrade}>
              Decline request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
