import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { cloud, ColumnMeta, downloadCsv, formatCell, pkFor, toCsv } from "./api";

interface TableInfo {
  name: string;
  rows: number;
  columns: number;
  readOnly: boolean;
}

export const TableBrowser = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [tableFilter, setTableFilter] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const [columns, setColumns] = useState<ColumnMeta[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [total, setTotal] = useState(0);
  const [readOnly, setReadOnly] = useState(false);
  const [masked, setMasked] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteRow, setDeleteRow] = useState<Record<string, any> | null>(null);

  const loadTables = async () => {
    try {
      const res = await cloud<{ tables: TableInfo[] }>("list-tables");
      setTables(res.tables);
      if (!selected && res.tables.length) setSelected(res.tables[0].name);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const loadRows = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await cloud<{
        columns: ColumnMeta[];
        rows: Record<string, any>[];
        total: number;
        readOnly: boolean;
        maskedColumns: string[];
      }>("list-rows", { table: selected, page, pageSize, search: search || undefined, sortBy, sortDir });
      setColumns(res.columns);
      setRows(res.rows);
      setTotal(res.total);
      setReadOnly(res.readOnly);
      setMasked(res.maskedColumns ?? []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
    setSortBy(undefined);
    setSearch("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  useEffect(() => {
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, page, sortBy, sortDir]);

  const filteredTables = useMemo(
    () => tables.filter((t) => t.name.toLowerCase().includes(tableFilter.toLowerCase())),
    [tables, tableFilter],
  );

  const pk = pkFor(selected ?? "", columns);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const openEdit = (row: Record<string, any>) => {
    setEditing(row);
    setCreating(false);
    setReason("");
    const f: Record<string, any> = {};
    for (const c of columns) if (!masked.includes(c.name)) f[c.name] = row[c.name] ?? "";
    setForm(f);
  };

  const openCreate = () => {
    setCreating(true);
    setEditing(null);
    setReason("");
    const f: Record<string, any> = {};
    for (const c of columns) {
      if (masked.includes(c.name) || c.name === "id" || c.name === "created_at" || c.name === "updated_at") continue;
      f[c.name] = "";
    }
    setForm(f);
  };

  const submit = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const values: Record<string, any> = {};
      for (const [k, v] of Object.entries(form)) {
        const col = columns.find((c) => c.name === k);
        if (!col) continue;
        if (typeof v === "string" && v.trim() === "") {
          values[k] = null;
          continue;
        }
        if (["jsonb", "json"].includes(col.type)) {
          try {
            values[k] = typeof v === "string" ? JSON.parse(v) : v;
          } catch {
            throw new Error(`${k} must be valid JSON`);
          }
        } else if (col.type === "boolean") {
          values[k] = v === true || v === "true";
        } else if (["numeric", "integer", "bigint", "double precision", "real"].includes(col.type)) {
          values[k] = Number(v);
        } else {
          values[k] = v;
        }
      }
      if (creating) {
        await cloud("insert-row", { table: selected, values, reason: reason || undefined });
        toast.success("Row created");
      } else {
        await cloud("update-row", {
          table: selected,
          pk,
          pkValue: editing?.[pk],
          values,
          reason: reason || undefined,
        });
        toast.success("Row updated");
      }
      setEditing(null);
      setCreating(false);
      loadRows();
      loadTables();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!selected || !deleteRow) return;
    setBusy(true);
    try {
      await cloud("delete-row", { table: selected, pk, pkValue: deleteRow[pk], reason: reason || undefined });
      toast.success("Row deleted");
      setDeleteRow(null);
      setReason("");
      loadRows();
      loadTables();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      {/* Table list */}
      <div className="rounded-lg border border-border">
        <div className="border-b border-border p-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              placeholder="Find table"
              className="pl-8"
            />
          </div>
        </div>
        <ScrollArea className="h-[420px]">
          <div className="p-2">
            {filteredTables.map((t) => (
              <button
                key={t.name}
                onClick={() => setSelected(t.name)}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                  selected === t.name ? "bg-secondary text-foreground" : "hover:bg-muted/60 text-muted-foreground"
                }`}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  {t.readOnly ? <Lock className="h-3 w-3 shrink-0" /> : <Database className="h-3 w-3 shrink-0" />}
                  <span className="truncate font-mono">{t.name}</span>
                </span>
                <span className="ml-2 shrink-0 tabular-nums">{t.rows}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Rows */}
      <div className="min-w-0 rounded-lg border border-border">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <span className="font-mono text-sm">{selected ?? "—"}</span>
          {readOnly && (
            <Badge variant="outline" className="border-amber-500/40 text-amber-500">
              read-only
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">{total} rows</span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPage(1);
                loadRows();
              }}
              className="relative"
            >
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search rows"
                className="h-9 w-40 pl-8"
              />
            </form>
            <Button size="sm" variant="outline" onClick={loadRows}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadCsv(
                  `${selected}-page${page}.csv`,
                  toCsv(columns.map((c) => c.name), rows),
                )
              }
            >
              <Download className="mr-1.5 h-4 w-4" /> CSV
            </Button>
            {!readOnly && (
              <Button size="sm" onClick={openCreate} disabled={!columns.length}>
                <Plus className="mr-1.5 h-4 w-4" /> New row
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (
                  <TableHead
                    key={c.name}
                    className="cursor-pointer whitespace-nowrap text-xs"
                    onClick={() => {
                      setSortBy(c.name);
                      setSortDir(sortBy === c.name && sortDir === "desc" ? "asc" : "desc");
                    }}
                  >
                    {c.name}
                    {sortBy === c.name ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                  </TableHead>
                ))}
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground">
                    No rows
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r, i) => (
                  <TableRow key={String(r[pk] ?? i)}>
                    {columns.map((c) => (
                      <TableCell key={c.name} className="max-w-[220px] truncate text-xs">
                        {formatCell(r[c.name])}
                      </TableCell>
                    ))}
                    <TableCell className="whitespace-nowrap">
                      {!readOnly && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => {
                              setDeleteRow(r);
                              setReason("");
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between border-t border-border p-3 text-xs">
          <span className="text-muted-foreground">
            Page {page} of {pages}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <Dialog
        open={!!editing || creating}
        onOpenChange={(o) => {
          if (!o) {
            setEditing(null);
            setCreating(false);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{creating ? "New row" : "Edit row"}</DialogTitle>
            <DialogDescription className="font-mono text-xs">{selected}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {Object.keys(form).map((name) => {
              const col = columns.find((c) => c.name === name);
              const isJson = col && ["jsonb", "json"].includes(col.type);
              return (
                <div key={name} className="space-y-1">
                  <Label className="text-xs">
                    {name} <span className="text-muted-foreground">({col?.type})</span>
                  </Label>
                  {isJson ? (
                    <Textarea
                      rows={3}
                      value={typeof form[name] === "string" ? form[name] : JSON.stringify(form[name] ?? "", null, 2)}
                      onChange={(e) => setForm({ ...form, [name]: e.target.value })}
                      className="font-mono text-xs"
                    />
                  ) : (
                    <Input
                      value={form[name] === null ? "" : String(form[name] ?? "")}
                      onChange={(e) => setForm({ ...form, [name]: e.target.value })}
                      className="text-xs"
                    />
                  )}
                </div>
              );
            })}
            <div className="space-y-1">
              <Label className="text-xs">Reason (audited)</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why this change?" />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setEditing(null);
                setCreating(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteRow} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this row?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the row from <span className="font-mono">{selected}</span>. The full row contents
              and your identity are recorded in the admin audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (audited)" />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TableBrowser;
