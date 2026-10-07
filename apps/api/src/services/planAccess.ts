import { Plan } from '@prisma/client';
import { prisma } from '../config/database';
import { PlanTier } from '../config/planLimits';

// The plan a user actually has right now: a running no-card trial overrides
// the stored plan.
export function getEffectivePlan(user: { plan: Plan; trialPlan?: Plan | null; trialEndsAt?: Date | null }): Plan {
  if (user.trialPlan && user.trialEndsAt && user.trialEndsAt > new Date()) {
    return user.trialPlan;
  }
  return user.plan;
}

// For plan-limit checks: read from the database, not the access token — the
// token's plan can be up to 15 minutes old (e.g. right after subscribing).
export async function loadEffectivePlan(userId: string): Promise<PlanTier> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, trialPlan: true, trialEndsAt: true },
  });
  return (user ? getEffectivePlan(user) : Plan.FREE) as PlanTier;
}

// Start of the monthly click-cap window (server time, which is UTC).
export function startOfCurrentMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}
