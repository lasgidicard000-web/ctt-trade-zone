import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GeneralFeeStatus {
  settings: { amount_usd: number; cycle_months: number; due_month: number; due_week: number; enabled: boolean; effective_from: string };
  cycle_start: string;
  next_cycle_start: string;
  is_general_member: boolean;
  paid_this_cycle: boolean;
  paid_at: string | null;
  due: boolean;
  usdt_balance: number;
  times_paid: number;
}

export function useGeneralFee(enabled = true) {
  const [status, setStatus] = useState<GeneralFeeStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!enabled) return;
    const { data, error } = await supabase.rpc("get_general_fee_status" as any);
    if (!error) setStatus(data as unknown as GeneralFeeStatus);
    setLoading(false);
  }, [enabled]);

  useEffect(() => { reload(); }, [reload]);

  const pay = async () => {
    const { data, error } = await supabase.rpc("pay_general_plan_fee" as any, { _agree: true });
    if (error) throw error;
    await reload();
    return data as any;
  };

  return { status, loading, reload, pay };
}
