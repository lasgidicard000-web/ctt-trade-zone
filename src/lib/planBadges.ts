import recruitBadge from "@/assets/plans/recruit.png.asset.json";
import inspectorsBadge from "@/assets/plans/inspectors.png.asset.json";
import superintendentBadge from "@/assets/plans/superintendent.png.asset.json";
import commissionersBadge from "@/assets/plans/commissioners.png.asset.json";
import generalBadge from "@/assets/plans/general.png.asset.json";

const BADGES: Record<string, string> = {
  recruit: recruitBadge.url,
  inspectors: inspectorsBadge.url,
  superintendent: superintendentBadge.url,
  commissioners: commissionersBadge.url,
  general: generalBadge.url,
};

/** Returns the shield badge artwork for a plan, or null for unknown plans. */
export const planBadgeUrl = (planId?: string | null): string | null => {
  if (!planId) return null;
  const key = planId.trim().toLowerCase().split(/\s+/)[0];
  return BADGES[key] ?? null;
};

export const planBadgeAlt = (planName?: string | null) =>
  `${planName?.trim() || "Investment plan"} badge`;
