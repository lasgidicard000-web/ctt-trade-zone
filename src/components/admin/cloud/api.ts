import { supabase } from "@/integrations/supabase/client";

export type CloudAction =
  | "list-tables"
  | "list-rows"
  | "insert-row"
  | "update-row"
  | "delete-row"
  | "list-users"
  | "user-detail"
  | "user-action"
  | "storage-list"
  | "storage-signed-url"
  | "storage-delete"
  | "ops-overview";

export async function cloud<T = any>(action: CloudAction, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-cloud", {
    body: { action, payload },
  });
  if (error) throw new Error(error.message);
  if ((data as any)?.error) {
    const e = (data as any).error;
    throw new Error(typeof e === "string" ? e : JSON.stringify(e));
  }
  return data as T;
}

export interface ColumnMeta {
  name: string;
  type: string;
  nullable: boolean;
  def: string | null;
}

export const PK_OVERRIDES: Record<string, string> = {
  app_settings: "key",
  plan_entitlements: "plan_id",
};

export const pkFor = (table: string, columns: ColumnMeta[]) =>
  PK_OVERRIDES[table] ?? (columns.some((c) => c.name === "id") ? "id" : columns[0]?.name);

export const formatCell = (v: unknown) => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
};

export const toCsv = (columns: string[], rows: Record<string, unknown>[]) => {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [columns.join(","), ...rows.map((r) => columns.map((c) => esc(formatCell(r[c]))).join(","))].join("\n");
};

export const downloadCsv = (filename: string, content: string) => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
