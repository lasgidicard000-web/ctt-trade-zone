import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles, Shield, Users, ExternalLink } from "lucide-react";
import { useEntitlements } from "@/hooks/useEntitlements";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const badgeClass = (color: string) => {
  switch (color) {
    case "amber": return "bg-amber-700/20 text-amber-500 border-amber-700/30";
    case "slate": return "bg-slate-400/20 text-slate-300 border-slate-400/30";
    case "yellow": return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
    case "cyan": return "bg-cyan-400/20 text-cyan-300 border-cyan-400/30";
    case "purple": return "bg-purple-400/20 text-purple-300 border-purple-400/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

export const EntitlementsCard = ({ userId }: { userId: string }) => {
  const { entitlements: ent, loading } = useEntitlements(userId);
  const [busy, setBusy] = useState(false);
  const [links, setLinks] = useState<Record<string, string> | null>(null);

  if (loading || ent.plan_id === "none") return null;

  const openCommunity = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("community-access");
      if (error) throw error;
      if (data?.links) {
        setLinks(data.links);
        toast({ title: "Community access unlocked", description: `Welcome, ${ent.plan_name} member.` });
      } else {
        throw new Error(data?.error || "Access denied");
      }
    } catch (e: any) {
      toast({ title: "Unable to load community links", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mb-6 p-5 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-background/60 flex items-center justify-center">
            <Crown className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{ent.plan_name} Benefits</h3>
              <Badge variant="outline" className={badgeClass(ent.badge_color)}>
                Tier {ent.tier_rank}
              </Badge>
              {ent.priority_support && (
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-500">
                  <Shield className="h-3 w-3 mr-1" /> Priority Support
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Active plan entitlements</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div>
          <p className="text-xs text-muted-foreground">Withdrawal fee</p>
          <p className="font-semibold text-lg">{(ent.withdrawal_fee_pct * 100).toFixed(2)}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Daily cap</p>
          <p className="font-semibold text-lg">${ent.daily_withdrawal_cap.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Premium features</p>
          <p className="font-semibold text-lg flex items-center gap-1">
            {ent.premium_features ? <><Sparkles className="h-4 w-4 text-primary" /> On</> : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Community</p>
          <p className="font-semibold text-lg flex items-center gap-1">
            {ent.community_access ? <><Users className="h-4 w-4 text-primary" /> Access</> : "—"}
          </p>
        </div>
      </div>

      {ent.community_access && (
        <div className="space-y-3">
          {!links ? (
            <Button onClick={openCommunity} disabled={busy} size="sm">
              <Users className="h-4 w-4 mr-2" />
              {busy ? "Loading..." : "Join CTT Community"}
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.entries(links).map(([name, url]) => (
                <Button key={name} asChild size="sm" variant="outline">
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    {name.charAt(0).toUpperCase() + name.slice(1)}
                  </a>
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
