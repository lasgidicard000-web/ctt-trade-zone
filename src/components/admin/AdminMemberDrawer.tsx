import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import type { AdminMember } from "./AdminMembers";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

interface Props {
  member: AdminMember | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

export const AdminMemberDrawer = ({ member, onOpenChange, onChanged }: Props) => {
  const [loading, setLoading] = useState(false);
  const [balances, setBalances] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [funding, setFunding] = useState<any[]>([]);
  const [merchant, setMerchant] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!member) return;
    const uid = member.user_id;
    setLoading(true);
    Promise.all([
      supabase.from("wallet_balances").select("coin_symbol, balance").eq("user_id", uid),
      supabase
        .from("user_investments")
        .select("plan_name, amount, daily_roi, status, started_at, ends_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false }),
      supabase
        .from("deposit_history")
        .select("coin_symbol, amount, confirmation_status, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("withdrawals")
        .select("amount, fee, status, wallet_address, created_at, notes")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("card_funding_requests")
        .select("amount_usd, status, coin_symbol, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("merchant_payment_requests")
        .select("merchant, amount_usd, status, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(20),
    ]).then(([b, i, d, w, f, m]) => {
      setBalances(b.data ?? []);
      setInvestments(i.data ?? []);
      setDeposits(d.data ?? []);
      setWithdrawals(w.data ?? []);
      setFunding(f.data ?? []);
      setMerchant(m.data ?? []);
      setLoading(false);
    });
  }, [member]);

  const toggleAdmin = async () => {
    if (!member) return;
    setBusy(true);
    if (member.is_admin) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", member.user_id)
        .eq("role", "admin");
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("Admin access removed");
    } else {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: member.user_id, role: "admin" });
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("Admin access granted");
    }
    onChanged();
  };

  const section = (title: string, rows: React.ReactNode) => (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">{title}</h4>
      <div className="space-y-1 text-xs text-muted-foreground">{rows}</div>
    </div>
  );

  return (
    <Sheet open={!!member} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{member?.display_name || member?.email || "Member"}</SheetTitle>
          <SheetDescription className="break-all">{member?.email}</SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Wallet {usd(member?.wallet_usd ?? 0)}</Badge>
              {member?.card && (
                <Badge variant="outline">
                  Card ••{member.card.last4} · {usd(member.card.balance_usd)} · {member.card.status}
                </Badge>
              )}
              {member?.live && <Badge variant="outline">Live {usd(member.live.balance)}</Badge>}
              {member?.is_admin && <Badge>Admin</Badge>}
            </div>

            <Button size="sm" variant="outline" disabled={busy} onClick={toggleAdmin}>
              {member?.is_admin ? (
                <>
                  <ShieldOff className="mr-2 h-4 w-4" /> Revoke admin
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" /> Make admin
                </>
              )}
            </Button>

            {section(
              "Balances",
              balances.length === 0 ? (
                <p>No balances</p>
              ) : (
                balances.map((b, idx) => (
                  <p key={idx}>
                    {b.coin_symbol}: {Number(b.balance).toLocaleString("en-US", { maximumFractionDigits: 8 })}
                  </p>
                ))
              )
            )}

            {section(
              "Investments",
              investments.length === 0 ? (
                <p>No investments</p>
              ) : (
                investments.map((i, idx) => (
                  <p key={idx}>
                    {i.plan_name} · {usd(Number(i.amount))} · {(Number(i.daily_roi) * 100).toFixed(2)}%/day ·{" "}
                    {i.status} · ends {new Date(i.ends_at).toLocaleDateString()}
                  </p>
                ))
              )
            )}

            {section(
              "Deposits",
              deposits.length === 0 ? (
                <p>No deposits</p>
              ) : (
                deposits.map((d, idx) => (
                  <p key={idx}>
                    {new Date(d.created_at).toLocaleDateString()} · {Number(d.amount)} {d.coin_symbol} ·{" "}
                    {d.confirmation_status}
                  </p>
                ))
              )
            )}

            {section(
              "Withdrawals",
              withdrawals.length === 0 ? (
                <p>No withdrawals</p>
              ) : (
                withdrawals.map((w, idx) => (
                  <p key={idx}>
                    {new Date(w.created_at).toLocaleDateString()} · {usd(Number(w.amount))} · {w.status}
                    {String(w.notes ?? "").startsWith("Live trading") ? " · live terminal" : ""}
                  </p>
                ))
              )
            )}

            {section(
              "Card funding",
              funding.length === 0 ? (
                <p>No funding requests</p>
              ) : (
                funding.map((f, idx) => (
                  <p key={idx}>
                    {new Date(f.created_at).toLocaleDateString()} · {usd(Number(f.amount_usd))} ·{" "}
                    {f.coin_symbol} · {f.status}
                  </p>
                ))
              )
            )}

            {section(
              "Merchant payments",
              merchant.length === 0 ? (
                <p>No merchant payments</p>
              ) : (
                merchant.map((m, idx) => (
                  <p key={idx}>
                    {new Date(m.created_at).toLocaleDateString()} · {m.merchant} ·{" "}
                    {usd(Number(m.amount_usd))} · {m.status}
                  </p>
                ))
              )
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default AdminMemberDrawer;
