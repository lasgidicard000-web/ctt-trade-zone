import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, RefreshCw, ChevronDown, ChevronRight, ShieldCheck } from "lucide-react";

interface Change {
  id: string;
  name: string;
  oldRoi: number;
  newRoi: number;
}

interface LogRow {
  id: string;
  created_at: string;
  admin_user_id: string;
  admin_email: string | null;
  mode: "delta" | "multiply" | "set" | string;
  value: number;
  active_only: boolean;
  propagate: boolean;
  plans_updated: number;
  investments_updated: number;
  changes: Change[] | null;
}

const PAGE_SIZE = 25;

const AdminRoiAudit = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<LogRow[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const [modeFilter, setModeFilter] = useState<string>("all");
  const [propagateFilter, setPropagateFilter] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-roi-audit", {
        body: {},
      });
      if (error) throw error;
      setRows((data as any)?.logs ?? []);
    } catch (e: any) {
      toast({
        title: "Failed to load audit log",
        description: e.message ?? "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      load();
    });
  }, [navigate]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (modeFilter !== "all" && r.mode !== modeFilter) return false;
      if (propagateFilter === "yes" && !r.propagate) return false;
      if (propagateFilter === "no" && r.propagate) return false;
      if (from && new Date(r.created_at) < new Date(from)) return false;
      if (to && new Date(r.created_at) > new Date(to + "T23:59:59")) return false;
      return true;
    });
  }, [rows, modeFilter, propagateFilter, from, to]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [modeFilter, propagateFilter, from, to]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exportCsv = () => {
    const header = [
      "timestamp",
      "admin_email",
      "mode",
      "value",
      "active_only",
      "propagate",
      "plans_updated",
      "investments_updated",
      "changes",
    ];
    const escape = (v: unknown) =>
      `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      header.join(","),
      ...filtered.map((r) =>
        [
          r.created_at,
          r.admin_email ?? r.admin_user_id,
          r.mode,
          r.value,
          r.active_only,
          r.propagate,
          r.plans_updated,
          r.investments_updated,
          JSON.stringify(r.changes ?? []),
        ]
          .map(escape)
          .join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roi-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmtValue = (r: LogRow) => {
    if (r.mode === "delta") return `${r.value > 0 ? "+" : ""}${r.value} pp`;
    if (r.mode === "multiply") return `× ${r.value}`;
    if (r.mode === "set") return `${r.value}%`;
    return String(r.value);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-7xl py-8">
        <div className="mb-6 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Admin
            </Button>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">ROI Regulation Audit</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-4">
            <div>
              <Label>Mode</Label>
              <Select value={modeFilter} onValueChange={setModeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="delta">Delta</SelectItem>
                  <SelectItem value="multiply">Multiply</SelectItem>
                  <SelectItem value="set">Set</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Propagated</Label>
              <Select value={propagateFilter} onValueChange={setPropagateFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Plans</TableHead>
                    <TableHead>Investments</TableHead>
                    <TableHead>Propagated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : paged.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        No audit entries match these filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paged.map((r) => {
                      const isOpen = expanded.has(r.id);
                      return (
                        <Fragment key={r.id}>
                          <TableRow
                            className="cursor-pointer"
                            onClick={() => toggle(r.id)}
                          >
                            <TableCell>
                              {isOpen ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(r.created_at).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-sm">
                              {r.admin_email ?? (
                                <span className="font-mono text-xs text-muted-foreground">
                                  {r.admin_user_id.slice(0, 8)}…
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {r.mode}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{fmtValue(r)}</TableCell>
                            <TableCell className="text-sm">
                              {r.active_only ? "Active plans only" : "All plans"}
                            </TableCell>
                            <TableCell className="font-semibold">{r.plans_updated}</TableCell>
                            <TableCell className="font-semibold">{r.investments_updated}</TableCell>
                            <TableCell>
                              {r.propagate ? (
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                  Yes
                                </Badge>
                              ) : (
                                <Badge variant="outline">No</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                          {isOpen && (
                            <TableRow key={`${r.id}-details`} className="bg-muted/30">
                              <TableCell colSpan={9} className="py-4">
                                {r.changes && r.changes.length > 0 ? (
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium mb-2">
                                      Plan changes ({r.changes.length})
                                    </p>
                                    <div className="grid gap-1 sm:grid-cols-2">
                                      {r.changes.map((c) => {
                                        const diff = c.newRoi - c.oldRoi;
                                        return (
                                          <div
                                            key={c.id}
                                            className="flex items-center justify-between rounded border border-border bg-background px-3 py-2 text-sm"
                                          >
                                            <span className="font-medium">{c.name}</span>
                                            <span className="font-mono text-xs">
                                              {(c.oldRoi * 100).toFixed(3)}% →{" "}
                                              <span
                                                className={
                                                  diff > 0
                                                    ? "text-emerald-500"
                                                    : diff < 0
                                                    ? "text-red-500"
                                                    : ""
                                                }
                                              >
                                                {(c.newRoi * 100).toFixed(3)}%
                                              </span>
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">No plan changes recorded.</p>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {filtered.length > PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <p className="text-muted-foreground">
              Page {page} of {totalPages} · {filtered.length} entries
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRoiAudit;
