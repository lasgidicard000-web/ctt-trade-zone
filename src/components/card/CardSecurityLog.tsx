import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, ShieldAlert, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CardSecurityEvent {
  id: string;
  action: string;
  success: boolean;
  detail: string | null;
  user_agent: string | null;
  created_at: string;
}

const LABELS: Record<string, string> = {
  pin_unlock: "PIN unlock",
  reveal: "Details revealed",
  copy_number: "Card number copied",
  auto_hide: "Details auto-hidden",
  manual_hide: "Details hidden manually",
};

const deviceHint = (ua?: string | null) => {
  if (!ua) return "";
  if (/iPhone|iPad/i.test(ua)) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Macintosh/i.test(ua)) return "macOS";
  if (/Windows/i.test(ua)) return "Windows";
  return "Web";
};

export const CardSecurityLog = ({ cardId }: { cardId: string }) => {
  const [events, setEvents] = useState<CardSecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("card_security_events")
      .select("id, action, success, detail, user_agent, created_at")
      .eq("card_id", cardId)
      .order("created_at", { ascending: false })
      .limit(25);
    setEvents((data ?? []) as CardSecurityEvent[]);
    setLoading(false);
  }, [cardId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Every unlock, reveal, copy and auto-hide on this card is recorded.
        </p>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {events.length === 0 ? (
        <p className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          {loading ? "Loading card security activity…" : "No card security activity recorded yet."}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {events.map((e) => (
            <li key={e.id} className="flex items-start gap-2 p-2.5">
              {e.success ? (
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold">{LABELS[e.action] ?? e.action}</p>
                {e.detail && <p className="truncate text-[11px] text-muted-foreground">{e.detail}</p>}
              </div>
              <div className="text-right text-[11px] text-muted-foreground">
                <p className="tabular-nums">{new Date(e.created_at).toLocaleString()}</p>
                <p>{deviceHint(e.user_agent)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
