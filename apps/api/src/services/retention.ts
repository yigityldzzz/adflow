import { prisma } from '../config/database';
import { limitFor, PlanTier } from '../config/planLimits';

// Enforces the data-retention window promised per plan on the pricing page
// (Free: 30 days, Pro: 1 year, Team: unlimited). Previously this was a claim
// with no backing implementation — data accumulated forever regardless of
// plan. Runs once a day; safe to run more often since it's idempotent.
//
// Deletion order matters: Conversion has an optional FK to Click with no
// cascade/set-null configured, so we delete old Conversions first, then only
// delete Click rows that are both past the cutoff AND have no remaining
// Conversion referencing them. Any Click still linked to a conversion inside
// the retention window is correctly preserved.
export async function enforceDataRetention(): Promise<void> {
  const users = await prisma.user.findMany({ select: { id: true, plan: true } });

  for (const user of users) {
    const limits = limitFor(user.plan as PlanTier);
    if (limits.retentionDays == null) continue; // unlimited — nothing to clean up

    const cutoff = new Date(Date.now() - limits.retentionDays * 24 * 60 * 60 * 1000);

    try {
      const deletedConversions = await prisma.conversion.deleteMany({
        where: { userId: user.id, timestamp: { lt: cutoff } },
      });

      const deletedClicks = await prisma.click.deleteMany({
        where: {
          userId: user.id,
          timestamp: { lt: cutoff },
          conversions: { none: {} },
        },
      });

      if (deletedConversions.count > 0 || deletedClicks.count > 0) {
        console.log(
          `[Retention] user=${user.id} plan=${user.plan} cutoff=${cutoff.toISOString()} ` +
          `deletedConversions=${deletedConversions.count} deletedClicks=${deletedClicks.count}`
        );
      }
    } catch (e) {
      console.error('[Retention] cleanup failed for user', user.id, e);
    }
  }
}
