import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Entitlements {
  plan_id: string;
  plan_name: string;
  tier_rank: number;
  withdrawal_fee_pct: number;
  daily_withdrawal_cap: number;
  priority_support: boolean;
  premium_features: boolean;
  community_access: boolean;
  badge_color: string;
}

const DEFAULT_ENT: Entitlements = {
  plan_id: "none",
  plan_name: "No Active Plan",
  tier_rank: 0,
  withdrawal_fee_pct: 0.01,
  daily_withdrawal_cap: 2000,
  priority_support: false,
  premium_features: false,
  community_access: false,
  badge_color: "muted",
};

export function useEntitlements(userId?: string | null) {
  const [entitlements, setEntitlements] = useState<Entitlements>(DEFAULT_ENT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setEntitlements(DEFAULT_ENT);
      setLoading(false);
      return;
    }
    let alive = true;
    const load = async () => {
      const { data } = await (supabase as any).rpc("get_user_entitlements", { _user_id: userId });
      if (!alive) return;
      const row = Array.isArray(data) ? data[0] : data;
      setEntitlements({
        ...DEFAULT_ENT,
        ...(row ?? {}),
        withdrawal_fee_pct: Number(row?.withdrawal_fee_pct ?? DEFAULT_ENT.withdrawal_fee_pct),
        daily_withdrawal_cap: Number(row?.daily_withdrawal_cap ?? DEFAULT_ENT.daily_withdrawal_cap),
        tier_rank: Number(row?.tier_rank ?? 0),
      });
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`entitlements_${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_investments", filter: `user_id=eq.${userId}` },
        () => load()
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { entitlements, loading };
}
