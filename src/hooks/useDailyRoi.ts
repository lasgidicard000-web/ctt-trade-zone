import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DailyRoiRow {
  investment_id: string;
  roi_date: string;
  roi: number;
}

export interface RoiStats {
  /** ROI rolled for today (fraction, e.g. 0.0173) — null if not rolled yet */
  todayRoi: number | null;
  /** Average of all rolled days so far */
  avgRoi: number;
  /** Sum of all completed days + prorated today */
  effectiveSum: number;
  /** Number of days rolled */
  days: number;
  rows: DailyRoiRow[];
}

const todayKey = () => new Date().toISOString().slice(0, 10);

const dayFraction = () => {
  const now = new Date();
  const startOfDay = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  return Math.min(1, Math.max(0, (now.getTime() - startOfDay) / 86400000));
};

export const buildStats = (rows: DailyRoiRow[]): RoiStats => {
  const today = todayKey();
  const past = rows.filter((r) => r.roi_date < today);
  const current = rows.find((r) => r.roi_date === today) ?? null;
  const pastSum = past.reduce((a, r) => a + Number(r.roi), 0);
  const todayRoi = current ? Number(current.roi) : null;
  const effectiveSum = pastSum + (todayRoi ?? 0) * dayFraction();
  const all = rows.map((r) => Number(r.roi));
  const avgRoi = all.length ? all.reduce((a, b) => a + b, 0) / all.length : 0;
  return { todayRoi, avgRoi, effectiveSum, days: rows.length, rows };
};

/**
 * Loads the per-day rolled ROI history for a user's investments and
 * exposes derived stats keyed by investment id.
 */
export const useDailyRoi = (userId?: string) => {
  const [byInvestment, setByInvestment] = useState<Record<string, RoiStats>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("investment_daily_roi")
      .select("investment_id, roi_date, roi")
      .eq("user_id", userId)
      .order("roi_date", { ascending: true });

    const grouped: Record<string, DailyRoiRow[]> = {};
    ((data ?? []) as DailyRoiRow[]).forEach((r) => {
      (grouped[r.investment_id] ||= []).push(r);
    });
    const stats: Record<string, RoiStats> = {};
    Object.entries(grouped).forEach(([id, rows]) => {
      stats[id] = buildStats(rows);
    });
    setByInvestment(stats);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    load();

    const channel = supabase
      .channel(`investment_daily_roi_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "investment_daily_roi",
          filter: `user_id=eq.${userId}`,
        },
        () => load()
      )
      .subscribe();

    // Re-derive prorated intraday values periodically
    const interval = setInterval(() => {
      setByInvestment((prev) => {
        const next: Record<string, RoiStats> = {};
        Object.entries(prev).forEach(([id, s]) => {
          next[id] = buildStats(s.rows);
        });
        return next;
      });
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [userId, load]);

  return { byInvestment, loading, reload: load };
};
