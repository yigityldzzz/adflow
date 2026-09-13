export type PlanTier = 'FREE' | 'PRO' | 'TEAM';

interface PlanLimits {
  maxCampaigns: number | null; // null = unlimited
  maxLinks: number | null;
  maxClicksPerMonth: number | null; // enforced in tracking/redirect.ts — over the cap, clicks still redirect but stop being recorded
  retentionDays: number | null; // null = unlimited retention (never auto-deleted)
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  FREE: { maxCampaigns: 1, maxLinks: 3, maxClicksPerMonth: 10000, retentionDays: 30 },
  PRO: { maxCampaigns: null, maxLinks: null, maxClicksPerMonth: null, retentionDays: 365 },
  TEAM: { maxCampaigns: null, maxLinks: null, maxClicksPerMonth: null, retentionDays: null },
};

export function limitFor(plan: PlanTier): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;
}
