import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw } from "lucide-react";
import { statusClass, type LogRow, type MailMessage } from "./types";

interface OutboxListProps {
  refreshKey: number;
  onOpen: (threadId: string) => void;
  onRefresh: () => void;
}

export default function OutboxList({ refreshKey, onOpen, onRefresh }: OutboxListProps) {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [sent, setSent] = useState<MailMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: logData }, { data: msgData }] = await Promise.all([
        supabase
          .from("email_send_log" as any)
          .select(
            "id, message_id, template_name, recipient_email, status, error_message, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("mail_messages" as any)
          .select("id, thread_id, message_id, created_at, direction")
          .eq("direction", "outbound")
          .order("created_at", { ascending: false })
          .limit(300),
      ]);
      setLogs(((logData ?? []) as unknown) as LogRow[]);
      setSent(((msgData ?? []) as unknown) as MailMessage[]);
      setLoading(false);
    };
    load();
  }, [refreshKey]);

  // Latest status per email, deduplicated by message_id.
  const dedupedLogs = useMemo(() => {
    const seen = new Set<string>();
    const out: LogRow[] = [];
    for (const row of logs) {
      const key = row.message_id ?? row.id;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(row);
    }
    return out;
  }, [logs]);

  const threadByMessageId = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of sent) if (m.message_id) map.set(m.message_id, m.thread_id);
    return map;
  }, [sent]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Outbox</CardTitle>
          <CardDescription>Every email sent, with its latest delivery status.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 font-medium">Recipient</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">When</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {dedupedLogs.map((row) => {
                  const threadId = row.message_id
                    ? threadByMessageId.get(row.message_id)
                    : undefined;
                  return (
                    <tr key={row.id} className="border-b border-border/50 align-top">
                      <td className="py-2 pr-4 break-all">{row.recipient_email}</td>
                      <td className="py-2 pr-4">{row.template_name}</td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className={statusClass(row.status)}>
                          {row.status}
                        </Badge>
                        {row.error_message ? (
                          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                            {row.error_message}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="py-2">
                        {threadId ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpen(threadId)}
                          >
                            Open thread
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
                {dedupedLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No emails sent yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
