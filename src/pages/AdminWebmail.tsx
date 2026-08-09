import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Mail, Shield } from "lucide-react";
import Composer from "@/components/webmail/Composer";
import InboxList from "@/components/webmail/InboxList";
import OutboxList from "@/components/webmail/OutboxList";
import DraftsList from "@/components/webmail/DraftsList";
import ThreadView from "@/components/webmail/ThreadView";
import TemplatesList from "@/components/webmail/TemplatesList";
import type { AdminUser, MailDraft } from "@/components/webmail/types";


export default function AdminWebmail() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tab, setTab] = useState("compose");
  const [openThread, setOpenThread] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<MailDraft | null>(null);
  const [unread, setUnread] = useState(0);

  const [inboxKey, setInboxKey] = useState(0);
  const [outboxKey, setOutboxKey] = useState(0);
  const [draftsKey, setDraftsKey] = useState(0);

  useEffect(() => {
    const run = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
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

  const loadUnread = useCallback(async () => {
    const { data } = await supabase
      .from("mail_threads" as any)
      .select("unread_count")
      .gt("unread_count", 0);
    const total = ((data ?? []) as any[]).reduce(
      (sum, r) => sum + (r.unread_count ?? 0),
      0
    );

    setUnread(total);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.functions.invoke("admin-list-users").then(({ data, error }) => {
      if (!error) setUsers(((data as any)?.users ?? []) as AdminUser[]);
    });
    loadUnread();
  }, [isAdmin, loadUnread]);

  // Live updates when a user replies.
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("webmail-inbound")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mail_messages" },
        () => {
          loadUnread();
          setInboxKey((k) => k + 1);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, loadUnread]);

  const openThreadFrom = (id: string) => {
    setOpenThread(id);
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
            Compose, track delivery, and read replies from users — all in one mailbox.
          </p>
        </div>
      </header>

      {openThread ? (
        <ThreadView
          threadId={openThread}
          onBack={() => setOpenThread(null)}
          onChanged={() => {
            loadUnread();
            setInboxKey((k) => k + 1);
            setOutboxKey((k) => k + 1);
          }}
        />
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="compose">Compose</TabsTrigger>
            <TabsTrigger value="inbox" className="gap-2">
              Inbox
              {unread > 0 ? (
                <Badge className="bg-primary px-1.5 py-0 text-primary-foreground">
                  {unread}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="outbox">Outbox</TabsTrigger>
            <TabsTrigger value="drafts">Drafts</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="mt-4">
            <Composer
              users={users}
              draft={editingDraft}
              userId={userId}
              onSent={() => {
                setOutboxKey((k) => k + 1);
                setDraftsKey((k) => k + 1);
              }}
              onDraftsChanged={() => setDraftsKey((k) => k + 1)}
              onDraftConsumed={() => setEditingDraft(null)}
            />
          </TabsContent>

          <TabsContent value="inbox" className="mt-4">
            <InboxList
              refreshKey={inboxKey}
              onOpen={openThreadFrom}
              onRefresh={() => {
                setInboxKey((k) => k + 1);
                loadUnread();
              }}
            />
          </TabsContent>

          <TabsContent value="outbox" className="mt-4">
            <OutboxList
              refreshKey={outboxKey}
              onOpen={openThreadFrom}
              onRefresh={() => setOutboxKey((k) => k + 1)}
            />
          </TabsContent>

          <TabsContent value="drafts" className="mt-4">
            <DraftsList
              refreshKey={draftsKey}
              onEdit={(d) => {
                setEditingDraft(d);
                setTab("compose");
              }}
              onRefresh={() => setDraftsKey((k) => k + 1)}
            />
          </TabsContent>
        </Tabs>
      )}
    </main>
  );
}
