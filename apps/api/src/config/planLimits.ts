export type PlanTier = 'FREE' | 'PRO' | 'TEAM';

interface PlanLimits {
  maxCampaigns: number | null; // null = unlimited
  maxLinks: number | null;
  maxClicksPerMonth: number | null; // tracked for future usage-based alerts; not enforced at redirect time
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  FREE: { maxCampaigns: 1, maxLinks: 3, maxClicksPerMonth: 10000 },
  PRO: { maxCampaigns: null, maxLinks: null, maxClicksPerMonth: null },
  TEAM: { maxCampaigns: null, maxLinks: null, maxClicksPerMonth: null },
};

export function limitFor(plan: PlanTier): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;
}
