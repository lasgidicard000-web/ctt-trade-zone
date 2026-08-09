import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react";
import type { MailDraft } from "./types";

interface DraftsListProps {
  refreshKey: number;
  onEdit: (draft: MailDraft) => void;
  onRefresh: () => void;
}

export default function DraftsList({ refreshKey, onEdit, onRefresh }: DraftsListProps) {
  const [drafts, setDrafts] = useState<MailDraft[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("mail_drafts" as any)
        .select("*")
        .order("updated_at", { ascending: false });
      setDrafts(((data ?? []) as unknown) as MailDraft[]);
      setLoading(false);
    };
    load();
  }, [refreshKey]);

  const remove = async (id: string) => {
    await supabase.from("mail_drafts" as any).delete().eq("id", id);
    toast.success("Draft discarded");
    onRefresh();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Drafts</CardTitle>
          <CardDescription>Saved messages you haven't sent yet.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && drafts.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">No drafts saved.</p>
        )}
        {drafts.map((d) => (
          <div
            key={d.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{d.subject || "(no subject)"}</p>
              <p className="truncate text-sm text-muted-foreground">
                {d.recipient_email || "No recipient"}
              </p>
              {d.body ? (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{d.body}</p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                Updated {new Date(d.updated_at).toLocaleString()}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="sm" onClick={() => onEdit(d)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => remove(d.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
