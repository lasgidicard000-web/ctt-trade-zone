import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Database,
  Plus,
  RefreshCw,
  Trash2,
  Pencil,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

type ColumnMeta = {
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: string;
  column_default: string | null;
  ordinal_position: number;
  is_identity: string;
};

type TablesMap = Record<string, ColumnMeta[]>;

const PAGE_SIZE = 50;

const isJsonType = (c: ColumnMeta) =>
  c.data_type === "jsonb" || c.data_type === "json";
const isBoolType = (c: ColumnMeta) => c.data_type === "boolean";
const isNumericType = (c: ColumnMeta) =>
  ["integer", "bigint", "smallint", "numeric", "double precision", "real"].includes(
    c.data_type,
  );
const isTimestampType = (c: ColumnMeta) =>
  c.data_type?.startsWith("timestamp") || c.data_type === "date";

const isReadOnly = (c: ColumnMeta) =>
  c.column_name === "id" ||
  c.column_name === "created_at" ||
  c.column_name === "updated_at" ||
  c.is_identity === "YES";

const guessPrimaryKey = (cols: ColumnMeta[]) =>
  cols.find((c) => c.column_name === "id")?.column_name ?? cols[0]?.column_name;

const AdminTables = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checking, setChecking] = useState(true);
  const [tables, setTables] = useState<TablesMap>({});
  const [tableFilter, setTableFilter] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"edit" | "insert">("edit");
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [editingRow, setEditingRow] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session?.user) {
        navigate("/auth");
        return;
      }
      const { data: role } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", sess.session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!role) {
        toast({
          title: "Access denied",
          description: "Admin only",
          variant: "destructive",
        });
        navigate("/wallet");
        return;
      }
      await loadTables();
      setChecking(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTables = async () => {
    const { data, error } = await supabase.rpc("admin_list_tables" as any);
    if (error) {
      toast({ title: "Failed to load tables", description: error.message, variant: "destructive" });
      return;
    }
    const grouped: TablesMap = {};
    (data as ColumnMeta[] & { table_name: string }[])?.forEach((row: any) => {
      const t = row.table_name;
      if (!grouped[t]) grouped[t] = [];
      grouped[t].push(row);
    });
    setTables(grouped);
  };

  const currentCols = selected ? tables[selected] ?? [] : [];
  const pk = useMemo(() => guessPrimaryKey(currentCols), [currentCols]);

  useEffect(() => {
    if (selected) loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, page, sortCol, sortAsc]);

  const loadRows = async () => {
    if (!selected) return;
    setLoading(true);
    let q = supabase
      .from(selected as any)
      .select("*", { count: "exact" })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (sortCol) q = q.order(sortCol, { ascending: sortAsc });
    const { data, count: c, error } = await q;
    setLoading(false);
    if (error) {
      toast({ title: "Load failed", description: error.message, variant: "destructive" });
      setRows([]);
      setCount(0);
      return;
    }
    setRows(data ?? []);
    setCount(c ?? 0);
  };

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) =>
      Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(s)),
    );
  }, [rows, search]);

  const openEdit = (row: any) => {
    setDrawerMode("edit");
    setEditingRow(row);
    const vals: Record<string, any> = {};
    currentCols.forEach((c) => {
      const v = row[c.column_name];
      vals[c.column_name] = isJsonType(c) && v != null ? JSON.stringify(v, null, 2) : v ?? "";
    });
    setFormValues(vals);
    setDrawerOpen(true);
  };

  const openInsert = () => {
    setDrawerMode("insert");
    setEditingRow(null);
    const vals: Record<string, any> = {};
    currentCols.forEach((c) => {
      vals[c.column_name] = "";
    });
    setFormValues(vals);
    setDrawerOpen(true);
  };

  const coerceValue = (c: ColumnMeta, raw: any): any => {
    if (raw === "" || raw === null || raw === undefined) return null;
    if (isJsonType(c)) {
      try {
        return JSON.parse(raw);
      } catch {
        throw new Error(`Invalid JSON for ${c.column_name}`);
      }
    }
    if (isBoolType(c)) return raw === true || raw === "true";
    if (isNumericType(c)) {
      const n = Number(raw);
      if (Number.isNaN(n)) throw new Error(`Invalid number for ${c.column_name}`);
      return n;
    }
    return raw;
  };

  const saveRow = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      for (const c of currentCols) {
        if (drawerMode === "edit" && isReadOnly(c)) continue;
        if (drawerMode === "insert" && (c.column_name === "id" || c.is_identity === "YES")) {
          if (formValues[c.column_name] === "" || formValues[c.column_name] == null) continue;
        }
        if (
          drawerMode === "insert" &&
          (c.column_name === "created_at" || c.column_name === "updated_at") &&
          (formValues[c.column_name] === "" || formValues[c.column_name] == null)
        ) {
          continue;
        }
        const v = coerceValue(c, formValues[c.column_name]);
        if (drawerMode === "insert" && v === null && c.column_default != null) continue;
        payload[c.column_name] = v;
      }

      if (drawerMode === "edit") {
        if (!pk) throw new Error("No primary key detected");
        const { error } = await supabase
          .from(selected as any)
          .update(payload)
          .eq(pk, editingRow[pk]);
        if (error) throw error;
        toast({ title: "Row updated" });
      } else {
        const { error } = await supabase.from(selected as any).insert(payload);
        if (error) throw error;
        toast({ title: "Row inserted" });
      }
      setDrawerOpen(false);
      loadRows();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!selected || !deleteTarget || !pk) return;
    const { error } = await supabase
      .from(selected as any)
      .delete()
      .eq(pk, deleteTarget[pk]);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Row deleted" });
      loadRows();
    }
    setDeleteTarget(null);
    setDeleteConfirm("");
  };

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const tableNames = useMemo(
    () =>
      Object.keys(tables)
        .filter((t) => t.toLowerCase().includes(tableFilter.toLowerCase()))
        .sort(),
    [tables, tableFilter],
  );

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border p-4 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Admin
        </Button>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Table Viewer</h1>
        </div>
      </div>

      <div className="flex" style={{ minHeight: "calc(100vh - 65px)" }}>
        <aside className="w-64 border-r border-border p-3 space-y-2 shrink-0">
          <Input
            placeholder="Filter tables…"
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
          />
          <div className="space-y-1 max-h-[calc(100vh-160px)] overflow-y-auto">
            {tableNames.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setSelected(t);
                  setPage(0);
                  setSortCol(null);
                  setSearch("");
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  selected === t
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 p-4 overflow-x-auto">
          {!selected ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a table to browse
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-mono">{selected}</span>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Search page…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-48"
                    />
                    <Button variant="outline" size="sm" onClick={loadRows}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={openInsert}>
                      <Plus className="mr-1 h-4 w-4" /> New row
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto border border-border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Actions</TableHead>
                        {currentCols.map((c) => (
                          <TableHead
                            key={c.column_name}
                            className="cursor-pointer whitespace-nowrap"
                            onClick={() => toggleSort(c.column_name)}
                          >
                            <div className="flex items-center gap-1">
                              <span>{c.column_name}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {c.udt_name}
                              </span>
                              {sortCol === c.column_name &&
                                (sortAsc ? (
                                  <ArrowUp className="h-3 w-3" />
                                ) : (
                                  <ArrowDown className="h-3 w-3" />
                                ))}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={currentCols.length + 1} className="text-center">
                            Loading…
                          </TableCell>
                        </TableRow>
                      ) : filteredRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={currentCols.length + 1} className="text-center text-muted-foreground">
                            No rows
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRows.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openEdit(row)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setDeleteTarget(row)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                            {currentCols.map((c) => {
                              const v = row[c.column_name];
                              const display =
                                v == null
                                  ? ""
                                  : typeof v === "object"
                                  ? JSON.stringify(v)
                                  : String(v);
                              return (
                                <TableCell
                                  key={c.column_name}
                                  className="font-mono text-xs max-w-xs truncate"
                                  title={display}
                                >
                                  {display}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-between mt-3 text-sm">
                  <span className="text-muted-foreground">
                    {count} rows · Page {page + 1} / {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Prev
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page + 1 >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {drawerMode === "edit" ? "Edit row" : "Insert row"} — {selected}
            </SheetTitle>
            <SheetDescription>
              Writes go through your existing row-level policies.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3 py-4">
            {currentCols.map((c) => {
              const readOnly = drawerMode === "edit" && isReadOnly(c);
              const commonProps = {
                id: c.column_name,
                value: formValues[c.column_name] ?? "",
                onChange: (e: any) =>
                  setFormValues({ ...formValues, [c.column_name]: e.target.value }),
                disabled: readOnly,
              };
              return (
                <div key={c.column_name} className="space-y-1">
                  <Label htmlFor={c.column_name} className="text-xs">
                    {c.column_name}{" "}
                    <span className="text-muted-foreground">
                      ({c.udt_name}
                      {c.is_nullable === "NO" ? ", not null" : ""}
                      {c.column_default ? `, default` : ""})
                    </span>
                  </Label>
                  {isJsonType(c) ? (
                    <Textarea {...commonProps} rows={4} className="font-mono text-xs" />
                  ) : isBoolType(c) ? (
                    <select
                      {...(commonProps as any)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">(null)</option>
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : (
                    <Input
                      {...commonProps}
                      type={isNumericType(c) ? "number" : isTimestampType(c) ? "text" : "text"}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setDrawerOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveRow} disabled={saving}>
              {saving ? "Saving…" : drawerMode === "edit" ? "Save changes" : "Insert"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Delete row?</SheetTitle>
            <SheetDescription>
              Type <span className="font-mono font-bold">delete</span> to confirm. This cannot be undone.
            </SheetDescription>
          </SheetHeader>
          <div className="py-4">
            <Input
              placeholder="delete"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
            />
          </div>
          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteConfirm("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirm !== "delete"}
              onClick={doDelete}
            >
              Delete
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminTables;
