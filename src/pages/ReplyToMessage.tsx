import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, MailWarning, Send } from "lucide-react";

interface ThreadMessage {
  id: string;
  direction: "inbound" | "outbound";
  heading: string | null;
  body: string;
  created_at: string;
}

type State = "loading" | "ok" | "invalid" | "expired" | "revoked" | "sent";

export default function ReplyToMessage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<State>("loading");
  const [subject, setSubject] = useState("");
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setState("invalid");
        return;
      }
      const { data, error } = await supabase.functions.invoke(
        `mail-reply?token=${encodeURIComponent(token)}`,
        { method: "GET" }
      );
      if (error || !data) {
        setState("invalid");
        return;
      }
      const status = (data as any).status as string;
      if (status !== "ok") {
        setState((status as State) ?? "invalid");
        return;
      }
      setSubject((data as any).subject ?? "");
      setRecipientName((data as any).recipientName ?? null);
      setMessages(((data as any).messages ?? []) as ThreadMessage[]);
      setState("ok");
    };
    load();
  }, [token]);

  const submit = async () => {
    if (!token || body.trim().length === 0) return;
    setSending(true);
    setError(null);
    const { data, error } = await supabase.functions.invoke("mail-reply", {
      body: { token, body: body.trim() },
    });
    setSending(false);
    if (error || (data as any)?.error) {
      const msg = (data as any)?.error;
      setError(typeof msg === "string" ? msg : "Could not send your reply. Please try again.");
      return;
    }
    setState("sent");
  };

  if (state === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state === "invalid" || state === "expired" || state === "revoked") {
    return (
      <main className="container mx-auto max-w-lg px-4 py-16 text-center">
        <MailWarning className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
        <h1 className="text-2xl font-bold">
          {state === "expired" ? "This reply link has expired" : "This reply link isn't valid"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Please use the link in the most recent email we sent you, or contact support at
          ctttradezone@caltexvault.com.
        </p>
      </main>
    );
  }

  if (state === "sent") {
    return (
      <main className="container mx-auto max-w-lg px-4 py-16 text-center">
        <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-primary" />
        <h1 className="text-2xl font-bold">Your reply has been sent</h1>
        <p className="mt-2 text-muted-foreground">
          Our support team has received your message and will get back to you by email.
        </p>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Reply to CTTTradezone</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {recipientName ? `Hi ${recipientName}, ` : ""}your reply goes straight to our support
        team.
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">{subject || "Conversation"}</CardTitle>
          <CardDescription>Previous messages in this conversation</CardDescription>
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
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                {m.direction === "inbound" ? "You" : "CTTTradezone support"} ·{" "}
                {new Date(m.created_at).toLocaleString()}
              </p>
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">No earlier messages.</p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Textarea
          rows={8}
          maxLength={5000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your reply…"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{body.length}/5000 characters</p>
          <Button onClick={submit} disabled={sending || body.trim().length === 0}>
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send reply
          </Button>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </main>
  );
}
