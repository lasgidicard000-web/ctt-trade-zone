import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { toast } from "sonner";
import { Copy, FileText, Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import TemplateEditor from "./TemplateEditor";
import { extractVars, type MailTemplate } from "./templateVars";

interface Props {
  userId: string | null;
  onChanged: () => void;
}

export default function TemplatesList({ userId, onChanged }: Props) {
  const [rows, setRows] = useState<MailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MailTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MailTemplate | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("mail_templates" as any)
      .select("*")
      .order("group_label", { ascending: true })
      .order("name", { ascending: true });
    setRows(
      ((data ?? []) as any[]).map((r) => ({
        ...r,
        variables: Array.isArray(r.variables) ? r.variables : [],
      })) as MailTemplate[]
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const duplicate = async (t: MailTemplate) => {
    const { error } = await supabase.from("mail_templates" as any).insert({
      name: `${t.name} (copy)`,
      group_label: t.group_label,
      subject: t.subject,
      heading: t.heading,
      body: t.body,
      button_label: t.button_label,
      button_url: t.button_url,
      variables: t.variables,
      created_by: userId,
    } as any);
    if (error) {
      toast.error("Could not duplicate the template.");
      return;
    }
    toast.success("Template duplicated");
    load();
    onChanged();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("mail_templates" as any)
      .delete()
      .eq("id", deleteTarget.id);
    setDeleteTarget(null);
    if (error) {
      toast.error("Could not delete the template.");
      return;
    }
    toast.success("Template deleted");
    load();
    onChanged();
  };

  if (creating || editing) {
    return (
      <TemplateEditor
        template={editing}
        userId={userId}
        onDone={() => {
          setCreating(false);
          setEditing(null);
          load();
          onChanged();
        }}
        onCancel={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>My templates</CardTitle>
          <CardDescription>
            Reusable messages with variables, available in the composer.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New template
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <FileText className="mx-auto mb-3 h-8 w-8" />
            <p className="text-sm">
              No custom templates yet. Create one to reuse it from the composer.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((t) => {
              const vars = extractVars([
                t.subject,
                t.heading,
                t.body,
                t.button_label,
                t.button_url,
              ]);
              return (
                <li key={t.id} className="flex flex-wrap items-start gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{t.name}</p>
                      <Badge variant="secondary">{t.group_label}</Badge>
                      {vars.length ? (
                        <Badge variant="outline">{vars.length} variables</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {t.subject || "No subject"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Updated {new Date(t.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(t)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => duplicate(t)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setDeleteTarget(t)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this template?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.name}” will be removed permanently. Sent emails are not
              affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
