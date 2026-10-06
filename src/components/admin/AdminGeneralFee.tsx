import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

const AdminGeneralFee = () => {
  const [settings, setSettings] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [members, setMembers] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [replies, setReplies] = useState<Record<string, string>>({});

  const load = async () => {
    const [s, m, i] = await Promise.all([
      supabase.rpc("general_fee_settings" as any),
      supabase.rpc("admin_list_general_fee_members" as any),
      supabase.from("plan_fee_inquiries" as any).select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setSettings(s.data); setAmount(String((s.data as any)?.amount_usd ?? ""));
    setMembers((m.data as any[]) ?? []);
    setInquiries((i.data as any[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async (patch: any) => {
    const { error } = await supabase.rpc("admin_set_general_fee_settings" as any, { _settings: patch });
    if (error) return toast.error(error.message);
    toast.success("Fee settings saved"); load();
  };

  const reply = async (id: string) => {
    const text = replies[id]?.trim();
    if (!text) return;
    const { error } = await supabase.from("plan_fee_inquiries" as any)
      .update({ admin_reply: text, status: "answered", replied_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Reply sent"); load();
  };

  const nameOf = (uid: string) => members.find((m) => m.user_id === uid)?.display_name || uid.slice(0, 8);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-lg">General plan fee settings</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4 items-end text-sm">
          <div className="space-y-2"><Label>Amount (USD)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div>Cycle: <strong>every 2 years</strong></div>
          <div>Due: <strong>first week of October</strong></div>
          <div className="flex items-center gap-2">
            <Switch checked={!!settings?.enabled} onCheckedChange={(v) => save({ enabled: v })} /> {settings?.enabled ? "On" : "Off"}
          </div>
          <Button onClick={() => save({ amount_usd: Number(amount) })}>Save amount</Button>
          <div className="md:col-span-3 text-muted-foreground">In effect from {settings?.effective_from}. Members pay only after they confirm.</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">General members ({members.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Member</TableHead><TableHead>Email</TableHead><TableHead>Wallet address</TableHead>
              <TableHead>Times paid</TableHead><TableHead>Fee dates</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.user_id}>
                  <TableCell>{m.display_name || "—"}</TableCell>
                  <TableCell>{m.email}</TableCell>
                  <TableCell className="max-w-[180px] truncate font-mono text-xs">{m.wallet_address || "—"}</TableCell>
                  <TableCell>{m.times_paid}</TableCell>
                  <TableCell className="text-xs">{(m.paid_dates ?? []).map((d: string) => format(new Date(d), "d MMM yyyy")).join(", ") || "—"}</TableCell>
                  <TableCell><Badge variant={m.status === "paid" ? "secondary" : m.status === "due" ? "destructive" : "outline"}>{m.status.replace(/_/g, " ")}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Member inquiries</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {inquiries.length === 0 && <p className="text-muted-foreground">No inquiries yet.</p>}
          {inquiries.map((q) => (
            <div key={q.id} className="rounded border p-3 space-y-2">
              <div className="flex justify-between"><span><strong>{nameOf(q.user_id)}</strong> · {format(new Date(q.created_at), "d MMM yyyy HH:mm")}</span><Badge variant="outline">{q.status}</Badge></div>
              <p>{q.message}</p>
              {q.admin_reply ? <p className="border-l-2 border-primary pl-2">{q.admin_reply}</p> : (
                <div className="flex gap-2">
                  <Textarea rows={2} value={replies[q.id] ?? ""} onChange={(e) => setReplies({ ...replies, [q.id]: e.target.value })} />
                  <Button onClick={() => reply(q.id)}>Reply</Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminGeneralFee;
