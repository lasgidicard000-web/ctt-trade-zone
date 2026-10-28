import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FmUpgradeRow {
  id: string;
  user_id: string;
  amount_usd: number;
  status: "pending" | "confirmed" | "rejected";
  btc_amount: number | null;
  btc_price: number | null;
  note: string | null;
  decided_at: string | null;
  created_at: string;
}

export type FmUpgradeStatus =
  | "loading"
  | "not-member"
  | "none"
  | "pending"
  | "confirmed";

// field_marshal_upgrades ships after the next types.ts regeneration; until then
// go through the untyped client and validate with the interfaces above.
const upgradesTable = () => (supabase as any).from("field_marshal_upgrades");

export const useFieldMarshalUpgrade = (userId?: string) => {
  const [isFieldMarshal, setIsFieldMarshal] = useState<boolean | null>(null);
  const [record, setRecord] = useState<FmUpgradeRow | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [{ data: inv }, { data: rec }] = await Promise.all([
      supabase
        .from("user_investments")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .or("plan_id.eq.field,plan_name.ilike.%field marshal%")
        .limit(1),
      upgradesTable()
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    setIsFieldMarshal((inv?.length ?? 0) > 0);
    setRecord((rec as FmUpgradeRow) ?? null);
    setReady(true);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Live updates when the admin desk confirms or declines the request.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`fm-upgrade-${userId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "field_marshal_upgrades",
          filter: `user_id=eq.${userId}`,
        } as any,
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  const requestUpgrade = useCallback(
    async (note?: string) => {
      if (!userId) throw new Error("Not signed in");
      const { data, error } = await upgradesTable()
        .insert({ user_id: userId, amount_usd: 500, note: note || null })
        .select()
        .single();
      if (error) throw error;
      setRecord(data as FmUpgradeRow);
      return data as FmUpgradeRow;
    },
    [userId]
  );

  const status: FmUpgradeStatus = !ready || isFieldMarshal === null
    ? "loading"
    : !isFieldMarshal
    ? "not-member"
    : record?.status === "confirmed"
    ? "confirmed"
    : record?.status === "pending"
    ? "pending"
    : "none";

  return { status, isFieldMarshal: isFieldMarshal === true, record, requestUpgrade, refresh };
};
