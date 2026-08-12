import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Ban, KeyRound, Link2, RefreshCw, Search, Shield, ShieldOff, Trash2, UserCheck } from "lucide-react";
import { cloud } from "./api";

interface UserRow {
  user_id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  confirmed: boolean;
  banned: boolean;
  roles: string[];
  is_admin: boolean;
}

export const UsersPanel = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [detailFor, setDetailFor] = useState<UserRow | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<UserRow | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await cloud<{ users: UserRow[] }>("list-users");
      setUsers(res.users);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (u: UserRow, kind: string) => {
    setBusy(u.user_id);
    try {
      await cloud("user-action", { kind, user_id: u.user_id });
      toast.success(`Done: ${kind.replace(/-/g, " ")}`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const openDetail = async (u: UserRow) => {
    setDetailFor(u);
    setDetail(null);
    try {
      setDetail(await cloud("user-detail", { user_id: u.user_id }));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return users.filter(
      (u) =>
        !s ||
        u.email?.toLowerCase().includes(s) ||
        u.display_name?.toLowerCase().includes(s) ||
        u.user_id.includes(s),
    );
  }, [users, q]);

  return (
    <div className="rounded-lg border border-border">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users" className="h-9 w-56 pl-8" />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} users</span>
        <Button size="sm" variant="outline" className="ml-auto" onClick={load}>
          <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last sign-in</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell className="text-xs">
                    <button className="text-left hover:underline" onClick={() => openDetail(u)}>
                      <div className="font-medium">{u.display_name ?? "—"}</div>
                      <div className="text-muted-foreground">{u.email ?? "no email"}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{u.user_id.slice(0, 8)}…</div>
                    </button>
                  </TableCell>
                  <TableCell className="space-x-1 text-xs">
                    {u.is_admin && (
                      <Badge variant="outline" className="border-accent/40 text-accent">
                        admin
                      </Badge>
                    )}
                    {u.banned && (
                      <Badge variant="outline" className="border-destructive/40 text-destructive">
                        banned
                      </Badge>
                    )}
                    {u.confirmed ? (
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-500">
                        confirmed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-500/40 text-amber-500">
                        pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-xs">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "never"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === u.user_id}
                        title={u.is_admin ? "Revoke admin" : "Grant admin"}
                        onClick={() => act(u, u.is_admin ? "revoke-admin" : "grant-admin")}
                      >
                        {u.is_admin ? <ShieldOff className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy === u.user_id}
                        title="Send password reset"
                        onClick={() => act(u, "reset-password")}
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy === u.user_id}
                        title="Send magic link"
                        onClick={() => act(u, "magic-link")}
                      >
                        <Link2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy === u.user_id}
                        title={u.banned ? "Unban" : "Ban"}
                        onClick={() => act(u, u.banned ? "unban" : "ban")}
                      >
                        {u.banned ? <UserCheck className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        title="Delete user"
                        onClick={() => {
                          setConfirmDelete(u);
                          setConfirmText("");
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!detailFor} onOpenChange={(o) => !o && setDetailFor(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{detailFor?.display_name ?? detailFor?.email ?? "User"}</SheetTitle>
          </SheetHeader>
          {!detail ? (
            <p className="py-6 text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="space-y-5 py-4 text-xs">
              {[
                ["Balances", detail.balances, (r: any) => `${r.coin_symbol}: ${r.balance}`],
                [
                  "Investments",
                  detail.investments,
                  (r: any) => `${r.plan_name} — $${r.amount} (${r.status})`,
                ],
                ["Cards", detail.cards, (r: any) => `•••• ${r.last4} — ${r.status} (${r.network})`],
                [
                  "Deposits",
                  detail.deposits,
                  (r: any) => `${r.coin_symbol} ${r.amount} — ${r.confirmation_status}`,
                ],
                ["Withdrawals", detail.withdrawals, (r: any) => `$${r.amount} (fee $${r.fee}) — ${r.status}`],
                [
                  "Transactions",
                  detail.transactions,
                  (r: any) => `${r.type} ${r.amount} ${r.to_symbol ?? r.from_symbol ?? ""} — ${r.status}`,
                ],
              ].map(([label, list, fmt]: any) => (
                <div key={label}>
                  <h4 className="mb-1 font-semibold uppercase tracking-wide text-muted-foreground">{label}</h4>
                  {(list ?? []).length === 0 ? (
                    <p className="text-muted-foreground">None</p>
                  ) : (
                    <ul className="space-y-1">
                      {list.map((r: any, i: number) => (
                        <li key={r.id ?? i} className="rounded bg-muted/40 px-2 py-1">
                          {fmt(r)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the auth account for {confirmDelete?.email ?? confirmDelete?.user_id}. Type DELETE to
              confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmText !== "DELETE"}
              onClick={() => {
                if (confirmDelete) act(confirmDelete, "delete-user");
                setConfirmDelete(null);
              }}
            >
              Delete user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UsersPanel;
