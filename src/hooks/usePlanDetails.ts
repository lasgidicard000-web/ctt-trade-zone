import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlanDetail = {
  id: string;
  name: string;
  coin: string;
  principal_min: number;
  principal_max: number;
  duration_days: number;
  sort_order: number;
  description: string | null;
  tagline: string | null;
  about: string | null;
  highlights: string[];
  show_on_homepage: boolean;
  show_on_dashboard: boolean;
};

type Surface = "homepage" | "dashboard";

export function usePlanDetails(surface: Surface) {
  const [plans, setPlans] = useState<PlanDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const column = surface === "homepage" ? "show_on_homepage" : "show_on_dashboard";
      const { data } = await supabase
        .from("plan_templates")
        .select(
          "id, name, coin, principal_min, principal_max, duration_days, sort_order, description, tagline, about, highlights, show_on_homepage, show_on_dashboard"
        )
        .eq("is_active", true)
        .eq(column, true)
        .order("sort_order", { ascending: true });

      if (!active) return;
      setPlans(
        (data ?? []).map((row: any) => ({
          ...row,
          highlights: Array.isArray(row.highlights) ? (row.highlights as string[]) : [],
        })) as PlanDetail[]
      );
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel(`plan-details-${surface}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "plan_templates" }, load)
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [surface]);

  return { plans, loading };
}
