import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ReferralStats {
  clicks: number;
  signups: number;
  rewardsTotal: number;
  rewardsPending: number;
}

export interface ReferralEvent {
  id: string;
  kind: "click" | "signup" | "reward";
  label: string;
  created_at: string;
  amount?: number;
}

export function useReferralStats(userId?: string | null) {
  const [stats, setStats] = useState<ReferralStats>({
    clicks: 0,
    signups: 0,
    rewardsTotal: 0,
    rewardsPending: 0,
  });
  const [events, setEvents] = useState<ReferralEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const [{ data: s }, { data: clicks }, { data: signups }, { data: rewards }] = await Promise.all([
      supabase.rpc("get_referral_stats"),
      supabase
        .from("referral_clicks")
        .select("id, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("referrals")
        .select("id, created_at, reward_claimed")
        .eq("referrer_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("rewards_history")
        .select("id, created_at, amount, description")
        .eq("user_id", userId)
        .eq("reward_type", "referral")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const row: any = Array.isArray(s) ? s[0] : s;
    if (row) {
      setStats({
        clicks: Number(row.clicks ?? 0),
        signups: Number(row.signups ?? 0),
        rewardsTotal: Number(row.rewards_total ?? 0),
        rewardsPending: Number(row.rewards_pending ?? 0),
      });
    }

    const merged: ReferralEvent[] = [
      ...(clicks ?? []).map((c: any) => ({
        id: `c-${c.id}`,
        kind: "click" as const,
        label: "Referral link opened",
        created_at: c.created_at,
      })),
      ...(signups ?? []).map((r: any) => ({
        id: `s-${r.id}`,
        kind: "signup" as const,
        label: r.reward_claimed ? "Signup — reward paid" : "Signup — reward pending",
        created_at: r.created_at,
      })),
      ...(rewards ?? []).map((r: any) => ({
        id: `r-${r.id}`,
        kind: "reward" as const,
        label: r.description || "Referral reward credited",
        created_at: r.created_at,
        amount: Number(r.amount),
      })),
    ]
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      .slice(0, 8);

    setEvents(merged);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, events, loading, refresh };
}
