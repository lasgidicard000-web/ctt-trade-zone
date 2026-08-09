import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import type { MailMessage, MailThread } from "./types";

interface ThreadViewProps {
  threadId: string;
  onBack: () => void;
  onChanged: () => void;
}

export default function ThreadView({ threadId, onBack, onChanged }: ThreadViewProps) {
  const [thread, setThread] = useState<MailThread | null>(null);
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    const { data: t } = await supabase
      .from("mail_threads" as any)
      .select("*")
      .eq("id", threadId)
      .maybeSingle();
    const { data: m } = await supabase
      .from("mail_messages" as any)
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });
    setThread((t as unknown) as MailThread);
    setMessages(((m ?? []) as unknown) as MailMessage[]);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    load();
    // Mark the conversation as read when opened.
    supabase
      .from("mail_threads" as any)
      .update({ unread_count: 0 } as any)
      .eq("id", threadId)
      .then(() => onChanged());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  useEffect(() => {
    const channel = supabase
      .channel(`mail-thread-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mail_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  const sendReply = async () => {
    if (!thread || reply.trim().length === 0) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke("admin-send-email", {
      body: {
        recipientEmail: thread.participant_email,
        subject: thread.subject.startsWith("Re:") ? thread.subject : `Re: ${thread.subject}`,
        body: reply.trim(),
        recipientName: thread.participant_name || undefined,
        threadId: thread.id,
        appOrigin: window.location.origin,
      },
    });
    setSending(false);
    if (error || (data as any)?.error) {
      const msg = (data as any)?.error;
      toast.error(typeof msg === "string" ? msg : "Could not send the reply.");
      return;
    }
    setReply("");
    toast.success("Reply queued");
    load();
    onChanged();
  };

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <Button variant="ghost" size="sm" className="mb-2 w-fit -ml-2" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <CardTitle className="break-words">{thread?.subject}</CardTitle>
        <CardDescription className="break-all">
          {thread?.participant_name ? `${thread.participant_name} · ` : ""}
          {thread?.participant_email}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-lg border p-3 text-sm ${
              m.direction === "inbound"
                ? "border-primary/30 bg-primary/5"
                : "border-border bg-muted/40"
            }`}
          >
            <div className="mb-1 flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] uppercase">
                {m.direction === "inbound" ? "User reply" : "Sent"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(m.created_at).toLocaleString()}
              </span>
            </div>
            {m.heading ? <p className="font-medium">{m.heading}</p> : null}
            <p className="whitespace-pre-wrap break-words">{m.body}</p>
          </div>
        ))}

        <div className="space-y-2 border-t border-border pt-4">
          <Textarea
            rows={5}
            maxLength={8000}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Reply to this user…"
          />
          <div className="flex justify-end">
            <Button onClick={sendReply} disabled={sending || reply.trim().length === 0}>
              {sending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send reply
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
