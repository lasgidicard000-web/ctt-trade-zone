import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  ArrowLeft,
  Copy,
  Download,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Clock,
  CircleDollarSign,
} from "lucide-react";

interface Redemption {
  id: string;
  user_id: string;
  gift_card_code: string;
  gift_card_type: string | null;
  gift_card_currency: string | null;
  crypto_symbol: string;
  amount: number | null;
  wallet_address: string;
  email: string | null;
  screenshot_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const STATUS_OPTIONS = ["all", "pending", "approved", "rejected", "paid"];

const statusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return (
        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
          <XCircle className="w-3 h-3 mr-1" /> Rejected
        </Badge>
      );
    case "paid":
      return (
        <Badge className="bg-accent/10 text-accent border-accent/20">
          <CircleDollarSign className="w-3 h-3 mr-1" /> Paid
        </Badge>
      );
    case "pending":
    default:
      return (
        <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
          <Clock className="w-3 h-3 mr-1" /> Pending
        </Badge>
      );
  }
};

const mask = (code: string) => {
  if (!code) return "";
  if (code.length <= 6) return "•".repeat(code.length);
  return `${code.slice(0, 3)}${"•".repeat(Math.max(4, code.length - 6))}${code.slice(-3)}`;
};

const truncate = (s: string, n = 14) =>
  s.length > n ? `${s.slice(0, 6)}...${s.slice(-4)}` : s;

const AdminRedemptions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Redemption | null>(null);
  const [revealCode, setRevealCode] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      const { data: role } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!role) {
        toast({
          title: "Access Denied",
          description: "Admin privileges required",
          variant: "destructive",
        });
        navigate("/");
        return;
      }
      await fetchAll();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAll = async () => {
    const { data, error } = await supabase
      .from("redemptions" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load redemptions",
        variant: "destructive",
      });
      return;
    }
    const rows = (data as any as Redemption[]) || [];
    setRedemptions(rows);
    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => {
        map[p.user_id] = p.display_name || "—";
      });
      setProfiles(map);
    }
  };

  const types = useMemo(() => {
    const set = new Set<string>();
    redemptions.forEach((r) => r.gift_card_type && set.add(r.gift_card_type));
    return ["all", ...Array.from(set)];
  }, [redemptions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return redemptions.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (typeFilter !== "all" && r.gift_card_type !== typeFilter) return false;
      if (!q) return true;
      return (
        r.gift_card_code.toLowerCase().includes(q) ||
        (r.email || "").toLowerCase().includes(q) ||
        r.wallet_address.toLowerCase().includes(q) ||
        (profiles[r.user_id] || "").toLowerCase().includes(q)
      );
    });
  }, [redemptions, statusFilter, typeFilter, search, profiles]);

  const stats = useMemo(() => {
    const s = { total: 0, pending: 0, approved: 0, rejected: 0, paid: 0 };
    redemptions.forEach((r) => {
      s.total++;
      if (r.status in s) (s as any)[r.status]++;
    });
    return s;
  }, [redemptions]);

  const copy = (text: string, label = "Copied") => {
    navigator.clipboard.writeText(text);
    toast({ title: label });
  };

  const updateStatus = async (status: string) => {
    if (!selected) return;
    setProcessing(true);
    const { error } = await supabase
      .from("redemptions" as any)
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", selected.id);
    setProcessing(false);
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: `Marked as ${status}` });
    setSelected(null);
    setAdminNote("");
    setRevealCode(false);
    await fetchAll();
  };

  const exportCsv = () => {
    const header = [
      "Date",
      "User",
      "Type",
      "Currency",
      "Code",
      "Amount",
      "Crypto",
      "Wallet",
      "Email",
      "Status",
    ];
    const rows = filtered.map((r) => [
      format(new Date(r.created_at), "yyyy-MM-dd HH:mm"),
      profiles[r.user_id] || r.user_id,
      r.gift_card_type || "",
      r.gift_card_currency || "",
      r.gift_card_code,
      r.amount ?? "",
      r.crypto_symbol,
      r.wallet_address,
      r.email || "",
      r.status,
    ]);
    const csv = [header, ...rows]
      .map((r) =>
        r
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `redemptions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin")}
              className="mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Admin
            </Button>
            <h1 className="text-3xl font-bold">Gift Card Redemptions</h1>
            <p className="text-muted-foreground text-sm">
              Review and process redemption submissions from users
            </p>
          </div>
          <Button onClick={exportCsv} variant="outline">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total", value: stats.total, color: "text-foreground" },
            { label: "Pending", value: stats.pending, color: "text-yellow-500" },
            { label: "Approved", value: stats.approved, color: "text-green-500" },
            { label: "Paid", value: stats.paid, color: "text-accent" },
            { label: "Rejected", value: stats.rejected, color: "text-red-500" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground uppercase">
                  {s.label}
                </p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6 grid gap-3 md:grid-cols-3">
            <Input
              placeholder="Search code, email, wallet, user…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "all" ? "All statuses" : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t === "all" ? "All types" : t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Submissions ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground text-sm py-6">
                No submissions match the current filters.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payout</TableHead>
                    <TableHead>Wallet</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(r.created_at), "MMM dd, HH:mm")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {profiles[r.user_id] || (
                          <span className="text-muted-foreground text-xs">
                            {r.user_id.slice(0, 6)}…
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.gift_card_type || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.gift_card_currency || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {mask(r.gift_card_code)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.amount ? `$${Number(r.amount).toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{r.crypto_symbol}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs">
                            {truncate(r.wallet_address)}
                          </span>
                          <button
                            onClick={() => copy(r.wallet_address, "Wallet copied")}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelected(r);
                            setRevealCode(false);
                            setAdminNote("");
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Redemption Details</DialogTitle>
            <DialogDescription>
              Submitted{" "}
              {selected &&
                format(new Date(selected.created_at), "PPpp")}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">User</p>
                  <p className="font-medium">
                    {profiles[selected.user_id] || selected.user_id}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">
                    Status
                  </p>
                  <div>{statusBadge(selected.status)}</div>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">
                    Gift Card Type
                  </p>
                  <p>{selected.gift_card_type || "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">
                    Currency
                  </p>
                  <p>{selected.gift_card_currency || "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">
                    Amount
                  </p>
                  <p>
                    {selected.amount
                      ? `$${Number(selected.amount).toFixed(2)}`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">
                    Payout Crypto
                  </p>
                  <p>{selected.crypto_symbol}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs uppercase text-muted-foreground">
                    Email
                  </p>
                  <div className="flex items-center gap-2">
                    <p>{selected.email || "—"}</p>
                    {selected.email && (
                      <button
                        onClick={() => copy(selected.email!, "Email copied")}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <p className="text-xs uppercase text-muted-foreground">
                    Wallet Address
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs break-all">
                      {selected.wallet_address}
                    </p>
                    <button
                      onClick={() =>
                        copy(selected.wallet_address, "Wallet copied")
                      }
                      className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="col-span-2">
                  <p className="text-xs uppercase text-muted-foreground mb-1">
                    Gift Card Code
                  </p>
                  <div className="flex items-center gap-2 bg-muted rounded p-3">
                    <span className="font-mono text-sm break-all flex-1">
                      {revealCode
                        ? selected.gift_card_code
                        : mask(selected.gift_card_code)}
                    </span>
                    <button
                      onClick={() => setRevealCode((v) => !v)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {revealCode ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() =>
                        copy(selected.gift_card_code, "Code copied")
                      }
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {selected.screenshot_url && (
                <div>
                  <p className="text-xs uppercase text-muted-foreground mb-2">
                    Screenshot
                  </p>
                  <a
                    href={selected.screenshot_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      src={selected.screenshot_url}
                      alt="Gift card screenshot"
                      className="max-h-64 rounded border"
                    />
                  </a>
                </div>
              )}

              <div>
                <p className="text-xs uppercase text-muted-foreground mb-1">
                  Admin Note (optional)
                </p>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Internal note for this decision…"
                  rows={2}
                />
              </div>

              <div className="flex flex-wrap gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => updateStatus("pending")}
                  disabled={processing || selected.status === "pending"}
                >
                  Mark Pending
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => updateStatus("rejected")}
                  disabled={processing}
                >
                  <XCircle className="w-4 h-4 mr-1" /> Reject
                </Button>
                <Button
                  onClick={() => updateStatus("approved")}
                  disabled={processing}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                </Button>
                <Button
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={() => updateStatus("paid")}
                  disabled={processing}
                >
                  <CircleDollarSign className="w-4 h-4 mr-1" /> Mark Paid
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRedemptions;
