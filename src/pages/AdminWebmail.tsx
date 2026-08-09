import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Loader2, Mail, RefreshCw, Send, Shield } from "lucide-react";

interface AdminUser {
  user_id: string;
  email: string | null;
  display_name: string | null;
}

interface LogRow {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

const PRESETS: Record<string, { label: string; subject: string; body: string }> = {
  blank: { label: "Blank message", subject: "", body: "" },
  account: {
    label: "Account notice",
    subject: "An important notice about your CTTTradezone account",
    body:
      "We're reaching out with an update regarding your CTTTradezone account.\n\n[Write the details here.]\n\nIf you have any questions, simply reply to this email and our team will assist you.\n\nThe CTTTradezone team",
  },
  funds: {
    label: "Deposit / withdrawal update",
    subject: "Update on your recent transaction",
    body:
      "Your recent transaction has been reviewed by our team.\n\n[Add the amount, coin and current status here.]\n\nYou can view the full details from your dashboard at any time.\n\nThe CTTTradezone team",
  },
  support: {
    label: "Support reply",
    subject: "Re: your support request",
    body:
      "Thanks for contacting CTTTradezone support.\n\n[Write your reply here.]\n\nLet us know if there is anything else we can help with.\n\nThe CTTTradezone team",
  },
};

const statusVariant = (status: string) => {
  switch (status) {
    case "sent":
      return "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
    case "pending":
      return "bg-amber-500/15 text-amber-500 border-amber-500/30";
    case "suppressed":
      return "bg-yellow-500/15 text-yellow-600 border-yellow-500/30";
    default:
      return "bg-destructive/15 text-destructive border-destructive/30";
  }
};

export default function AdminWebmail() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [recipient, setRecipient] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [subject, setSubject] = useState("");
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");
  const [buttonLabel, setButtonLabel] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    const run = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      const { data } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
      setChecking(false);
    };
    run();
  }, [navigate]);

  const loadUsers = async () => {
    const { data, error } = await supabase.functions.invoke("admin-list-users");
    if (error) return;
    setUsers(((data as any)?.users ?? []) as AdminUser[]);
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    const { data } = await supabase
      .from("email_send_log" as any)
      .select("id, message_id, template_name, recipient_email, status, error_message, created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    setLogs(((data ?? []) as unknown) as LogRow[]);
    setLoadingLogs(false);
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers();
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Deduplicate by message_id, keeping the latest row per email.
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

  const applyPreset = (key: string) => {
    const preset = PRESETS[key];
    if (!preset) return;
    setSubject(preset.subject);
    setBody(preset.body);
    setHeading("");
  };

  const previewHtml = useMemo(() => {
    const paragraphs = body
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
      <div style="padding:24px;max-width:600px">
        <div style="background:#10102E;border-radius:12px;padding:16px 20px;margin:0 0 24px">
          <p style="color:#fff;font-size:18px;font-weight:bold;letter-spacing:.5px;margin:0">CTTTradezone</p>
        </div>
        <h1 style="font-size:24px;color:#10102E;margin:0 0 20px;line-height:1.3">${esc(heading || subject || "Subject")}</h1>
        ${recipientName ? `<p style="font-size:16px;color:#5B6472;line-height:1.6;margin:0 0 20px">Hi ${esc(recipientName)},</p>` : ""}
        ${paragraphs
          .map(
            (p) =>
              `<p style="font-size:16px;color:#5B6472;line-height:1.6;margin:0 0 20px;word-break:break-word">${esc(p)}</p>`
          )
          .join("")}
        ${
          buttonLabel && buttonUrl
            ? `<a href="#" style="background:#1111D4;color:#fff;font-size:16px;border-radius:12px;padding:16px 28px;font-weight:bold;display:inline-block;text-decoration:none">${esc(buttonLabel)}</a>`
            : ""
        }
        <p style="font-size:13px;color:#8A93A3;line-height:1.6;margin:32px 0 0">CTTTradezone Investment Center — this message was sent by our support team regarding your account.</p>
      </div></body></html>`;
  }, [body, heading, subject, recipientName, buttonLabel, buttonUrl]);

  const canSend =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.trim()) &&
    subject.trim().length > 0 &&
    body.trim().length > 0;

  const handleSend = async () => {
    setSending(true);
    const { data, error } = await supabase.functions.invoke("admin-send-email", {
      body: {
        recipientEmail: recipient.trim(),
        subject: subject.trim(),
        heading: heading.trim() || undefined,
        body: body.trim(),
        buttonLabel: buttonLabel.trim() || undefined,
        buttonUrl: buttonUrl.trim() || undefined,
        recipientName: recipientName.trim() || undefined,
      },
    });
    setSending(false);
    setConfirmOpen(false);

    if (error) {
      const msg = (data as any)?.error;
      toast.error(
        typeof msg === "string" ? msg : "Could not send the email. Please try again."
      );
      return;
    }
    if ((data as any)?.error) {
      toast.error(String((data as any).error));
      return;
    }
    toast.success(`Message queued for ${recipient.trim()}`);
    setBody("");
    setSubject("");
    setHeading("");
    setButtonLabel("");
    setButtonUrl("");
    loadLogs();
  };

  if (checking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <main className="container mx-auto max-w-xl px-4 py-16 text-center">
        <Shield className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Admins only</h1>
        <p className="mt-2 text-muted-foreground">
          You need administrator access to open the webmail composer.
        </p>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-6 flex items-center gap-3">
        <Mail className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Webmail</h1>
          <p className="text-sm text-muted-foreground">
            Send a branded email to one user at a time and track delivery.
          </p>
        </div>
      </header>

      <Tabs defaultValue="compose">
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="sent">Sent mail</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>New message</CardTitle>
                <CardDescription>
                  One recipient per send. Account and support notices only — no bulk or
                  promotional mail.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Start from a template</Label>
                  <Select onValueChange={applyPreset}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a starting point" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRESETS).map(([key, p]) => (
                        <SelectItem key={key} value={key}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Pick a registered user</Label>
                  <Select
                    onValueChange={(val) => {
                      const u = users.find((x) => x.user_id === val);
                      if (u?.email) setRecipient(u.email);
                      if (u?.display_name) setRecipientName(u.display_name);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          users.length ? "Search users" : "Loading users…"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {users
                        .filter((u) => u.email)
                        .map((u) => (
                          <SelectItem key={u.user_id} value={u.user_id}>
                            {u.display_name ? `${u.display_name} — ` : ""}
                            {u.email}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="recipient">Recipient email</Label>
                    <Input
                      id="recipient"
                      type="email"
                      maxLength={255}
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="recipientName">Recipient name (optional)</Label>
                    <Input
                      id="recipientName"
                      maxLength={100}
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Jeremy"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    maxLength={200}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Update on your account"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="heading">Heading in email (optional)</Label>
                  <Input
                    id="heading"
                    maxLength={200}
                    value={heading}
                    onChange={(e) => setHeading(e.target.value)}
                    placeholder="Defaults to the subject"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="body">Message</Label>
                  <Textarea
                    id="body"
                    rows={10}
                    maxLength={8000}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write your message. Leave a blank line between paragraphs."
                  />
                  <p className="text-xs text-muted-foreground">
                    {body.length}/8000 characters
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="buttonLabel">Button label (optional)</Label>
                    <Input
                      id="buttonLabel"
                      maxLength={60}
                      value={buttonLabel}
                      onChange={(e) => setButtonLabel(e.target.value)}
                      placeholder="Open your dashboard"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="buttonUrl">Button link (optional)</Label>
                    <Input
                      id="buttonUrl"
                      maxLength={500}
                      value={buttonUrl}
                      onChange={(e) => setButtonUrl(e.target.value)}
                      placeholder="https://ctttradezone.com/wallet"
                    />
                  </div>
                </div>

                <Button
                  className="w-full"
                  disabled={!canSend || sending}
                  onClick={() => setConfirmOpen(true)}
                >
                  {sending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send email
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>Exactly what the user receives.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-lg border border-border bg-white">
                  <iframe
                    title="Email preview"
                    srcDoc={previewHtml}
                    className="h-[560px] w-full"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sent" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sent mail</CardTitle>
                <CardDescription>
                  Latest status per email, newest first.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadLogs} disabled={loadingLogs}>
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${loadingLogs ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="py-2 pr-4 font-medium">Recipient</th>
                      <th className="py-2 pr-4 font-medium">Type</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 pr-4 font-medium">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dedupedLogs.map((row) => (
                      <tr key={row.id} className="border-b border-border/50 align-top">
                        <td className="py-2 pr-4 break-all">{row.recipient_email}</td>
                        <td className="py-2 pr-4">{row.template_name}</td>
                        <td className="py-2 pr-4">
                          <Badge variant="outline" className={statusVariant(row.status)}>
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
                      </tr>
                    ))}
                    {dedupedLogs.length === 0 && !loadingLogs && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-muted-foreground">
                          No emails sent yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this email?</AlertDialogTitle>
            <AlertDialogDescription>
              To: <span className="font-medium">{recipient}</span>
              <br />
              Subject: <span className="font-medium">{subject}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend} disabled={sending}>
              Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
