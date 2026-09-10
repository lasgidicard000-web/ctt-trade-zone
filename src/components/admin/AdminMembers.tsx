import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { RefreshCw, Search } from "lucide-react";
import { AdminMemberDrawer } from "./AdminMemberDrawer";
import { ManualBalanceAdjustment } from "./ManualBalanceAdjustment";
import type { AdminTotals } from "./AdminOverview";

export interface AdminMember {
  user_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  roles: string[];
  is_admin: boolean;
  wallet_usd: number;
  live: { balance: number; realized_pnl: number } | null;
  plan: {
    plan_name: string;
    amount: number;
    daily_roi: number;
    status: string;
    started_at: string;
    ends_at: string;
  } | null;
  card: {
    id: string;
    last4: string;
    status: string;
    network: string;
    balance_usd: number;
    activated: boolean;
  } | null;
  pending: { funding: number; merchant: number; withdrawals: number };
}

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export const AdminMembers = ({
  members,
  loading,
  reload,
}: {
  members: AdminMember[];
  loading: boolean;
  reload: () => void;
}) => {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AdminMember | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        (m.email ?? "").toLowerCase().includes(q) ||
        (m.display_name ?? "").toLowerCase().includes(q) ||
        m.user_id.includes(q)
    );
  }, [members, query]);

  return (
    <div className="space-y-4">
      <ManualBalanceAdjustment onDone={reload} />
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base">
            <span>All members ({members.length})</span>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, email or ID"
                  className="h-9 w-56 pl-8"
                />
              </div>
              <Button size="sm" variant="outline" onClick={reload}>
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
                  <TableHead>Member</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Wallet value</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Card</TableHead>
                  <TableHead className="text-right">Live balance</TableHead>
                  <TableHead>Waiting</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Loading members…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No members match that search
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((m) => {
                    const pending =
                      m.pending.funding + m.pending.merchant + m.pending.withdrawals;
                    return (
                      <TableRow
                        key={m.user_id}
                        className="cursor-pointer"
                        onClick={() => setSelected(m)}
                      >
                        <TableCell className="text-sm">
                          <span className="font-medium">
                            {m.display_name || m.email || m.user_id.slice(0, 8)}
                          </span>
                          <div className="text-xs text-muted-foreground">{m.email ?? "—"}</div>
                          {m.is_admin && (
                            <Badge variant="outline" className="mt-1 text-[10px]">
                              admin
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {m.created_at ? new Date(m.created_at).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {usd(m.wallet_usd)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {m.plan ? (
                            <>
                              {m.plan.plan_name}
                              <div className="text-muted-foreground">
                                {usd(m.plan.amount)} · {m.plan.status}
                              </div>
                            </>
                          ) : (
                            <span className="text-muted-foreground">No plan</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {m.card ? (
                            <>
                              ••{m.card.last4}
                              <div className="text-muted-foreground">
                                {usd(m.card.balance_usd)} ·{" "}
                                {m.card.activated ? m.card.status : "not activated"}
                              </div>
                            </>
                          ) : (
                            <span className="text-muted-foreground">No card</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {m.live ? usd(m.live.balance) : "—"}
                        </TableCell>
                        <TableCell>
                          {pending > 0 ? (
                            <Badge variant="outline" className="border-amber-500/40 text-amber-500">
                              {pending}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AdminMemberDrawer
        member={selected}
        onOpenChange={(o) => !o && setSelected(null)}
        onChanged={() => {
          setSelected(null);
          reload();
        }}
      />
    </div>
  );
};

/** Loads every member with balances, plan and card summary from the admin function. */
export function useAdminMembers() {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [totals, setTotals] = useState<AdminTotals | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-list-users");
    setLoading(false);
    if (error) {
      toast.error(error.message || "Could not load members");
      return;
    }
    setMembers(((data as any)?.users ?? []) as AdminMember[]);
    setTotals(((data as any)?.totals ?? null) as AdminTotals | null);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { members, totals, loading, reload };
}

export default AdminMembers;
