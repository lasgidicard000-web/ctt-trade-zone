import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useGeneralFee } from "@/hooks/useGeneralFee";

const usd = (n: number) => `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const GeneralFeeInquiries = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const { status } = useGeneralFee(!!userId);
  const [charges, setCharges] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async (uid: string) => {
    const [c, s, i] = await Promise.all([
      supabase.from("plan_fee_charges" as any).select("*").eq("user_id", uid).order("paid_at", { ascending: false }),
      supabase.rpc("get_general_fee_stats" as any),
      supabase.from("plan_fee_inquiries" as any).select("*").eq("user_id", uid).order("created_at", { ascending: false }),
    ]);
    setCharges((c.data as any[]) ?? []);
    setStats(s.data);
    setInquiries((i.data as any[]) ?? []);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { navigate("/auth"); return; }
      setUserId(data.session.user.id);
      load(data.session.user.id);
    });
  }, [navigate]);

  const send = async () => {
    if (!userId || !msg.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("plan_fee_inquiries" as any).insert({ user_id: userId, message: msg.trim().slice(0, 2000) });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Inquiry sent to the admin desk");
    setMsg("");
    load(userId);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl space-y-6 py-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">General plan fee inquiries</h1>
            <p className="text-muted-foreground text-sm">
              {status ? `${usd(status.settings.amount_usd)} once every 2 years, first week of October. Rule in effect from ${format(new Date(status.settings.effective_from), "d MMM yyyy")}.` : "Loading..."}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">Your fee history</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div>Times paid: <strong>{charges.length}</strong></div>
            {charges.length === 0 ? <p className="text-muted-foreground">You have not paid any General plan fees.</p> :
              charges.map((c) => (
                <div key={c.id} className="flex justify-between border-b py-1">
                  <span>{format(new Date(c.paid_at), "d MMM yyyy HH:mm")}</span>
                  <span>{usd(c.amount_usd)}</span>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">All General members (anonymised)</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-3">
            {stats && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div><div className="text-muted-foreground">Members covered</div><div className="text-xl font-semibold">{stats.members_covered}</div></div>
                  <div><div className="text-muted-foreground">Paid this cycle</div><div className="text-xl font-semibold">{stats.paid_this_cycle}</div></div>
                  <div><div className="text-muted-foreground">Pending</div><div className="text-xl font-semibold">{stats.pending_this_cycle}</div></div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Payments by month</div>
                  {stats.by_month.length === 0 ? <p className="text-muted-foreground">No payments yet.</p> :
                    stats.by_month.map((m: any) => (
                      <div key={m.month} className="flex justify-between border-b py-1">
                        <span>{m.month}</span><span>{m.count} payment(s) · {usd(m.total_usd)}</span>
                      </div>
                    ))}
                </div>
              </>
            )}
            <p className="text-xs text-muted-foreground">Real figures only. No names, emails or addresses of other members are shown.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Send an inquiry</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} maxLength={2000} placeholder="Ask the admin desk about the General plan fee..." />
            <Button onClick={send} disabled={busy || !msg.trim()}>{busy ? "Sending..." : "Send inquiry"}</Button>
            {inquiries.map((q) => (
              <div key={q.id} className="rounded border p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">{format(new Date(q.created_at), "d MMM yyyy HH:mm")}</span><Badge variant="outline">{q.status}</Badge></div>
                <p>{q.message}</p>
                {q.admin_reply && <p className="border-l-2 border-primary pl-2"><strong>Admin desk:</strong> {q.admin_reply}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GeneralFeeInquiries;
