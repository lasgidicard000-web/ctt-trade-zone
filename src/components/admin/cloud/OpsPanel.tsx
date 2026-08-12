import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Server, MailWarning, Mail } from "lucide-react";
import { cloud } from "./api";

export const OpsPanel = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setData(await cloud("ops-overview"));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const statusColor = (s: string) =>
    s === "sent" || s === "delivered"
      ? "border-emerald-500/40 text-emerald-500"
      : s === "failed" || s === "bounced"
      ? "border-destructive/40 text-destructive"
      : "border-amber-500/40 text-amber-500";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {loading ? "Loading…" : `${data?.functions?.length ?? 0} deployed functions`}
        </span>
        <Button size="sm" variant="outline" onClick={load}>
          <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-4 w-4" /> Edge functions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(data?.functions ?? []).map((f: string) => (
            <Badge key={f} variant="outline" className="font-mono text-[11px]">
              {f}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" /> Email queue state
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-xs sm:grid-cols-3">
          {data?.emailState ? (
            <>
              <div>
                <div className="text-muted-foreground">Batch size</div>
                <div className="font-semibold">{data.emailState.batch_size}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Send delay</div>
                <div className="font-semibold">{data.emailState.send_delay_ms} ms</div>
              </div>
              <div>
                <div className="text-muted-foreground">Retry paused until</div>
                <div className="font-semibold">
                  {data.emailState.retry_after_until
                    ? new Date(data.emailState.retry_after_until).toLocaleString()
                    : "not paused"}
                </div>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">No queue state row.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent email sends</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.emailLog ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No sends logged
                  </TableCell>
                </TableRow>
              ) : (
                data.emailLog.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{r.template_name}</TableCell>
                    <TableCell className="text-xs">{r.recipient_email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColor(r.status)}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                      {r.error_message ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MailWarning className="h-4 w-4" /> Suppressed addresses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs">
          {(data?.suppressed ?? []).length === 0 ? (
            <p className="text-muted-foreground">None suppressed.</p>
          ) : (
            data.suppressed.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between rounded bg-muted/40 px-2 py-1">
                <span>{s.email}</span>
                <span className="text-muted-foreground">{s.reason}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OpsPanel;
