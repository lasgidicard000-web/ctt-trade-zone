import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw } from "lucide-react";
import type { MailMessage, MailThread } from "./types";

interface InboxListProps {
  refreshKey: number;
  onOpen: (threadId: string) => void;
  onRefresh: () => void;
}

interface Row extends MailThread {
  latest_reply?: string;
}

export default function InboxList({ refreshKey, onOpen, onRefresh }: InboxListProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: inbound } = await supabase
        .from("mail_messages" as any)
        .select("thread_id, body, created_at, direction")
        .eq("direction", "inbound")
        .order("created_at", { ascending: false })
        .limit(300);

      const messages = ((inbound ?? []) as unknown) as MailMessage[];
      const latestByThread = new Map<string, MailMessage>();
      for (const m of messages) {
        if (!latestByThread.has(m.thread_id)) latestByThread.set(m.thread_id, m);
      }
      const ids = [...latestByThread.keys()];
      if (ids.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data: threads } = await supabase
        .from("mail_threads" as any)
        .select("*")
        .in("id", ids)
        .order("last_message_at", { ascending: false });

      setRows(
        (((threads ?? []) as unknown) as MailThread[]).map((t) => ({
          ...t,
          latest_reply: latestByThread.get(t.id)?.body,
        }))
      );
      setLoading(false);
    };
    load();
  }, [refreshKey]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Inbox</CardTitle>
          <CardDescription>Replies received from users, newest first.</CardDescription>
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
        {!loading && rows.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">No replies yet.</p>
        )}
        {rows.map((t) => (
          <button
            key={t.id}
            onClick={() => onOpen(t.id)}
            className="w-full rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {t.participant_name || t.participant_email}
                </p>
                <p className="truncate text-sm text-muted-foreground">{t.subject}</p>
                {t.latest_reply ? (
                  <p className="mt-1 line-clamp-2 text-sm">{t.latest_reply}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {t.unread_count > 0 ? (
                  <Badge className="bg-primary text-primary-foreground">
                    {t.unread_count} new
                  </Badge>
                ) : null}
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(t.last_message_at).toLocaleString()}
                </span>
              </div>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
