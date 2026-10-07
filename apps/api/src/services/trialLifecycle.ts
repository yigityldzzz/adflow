import { prisma } from '../config/database';
import { sendMail } from './mailer';
import { trialEndingEmail, trialEndedEmail } from './emailTemplates';

// Emails around the no-card registration trial (User.trialPlan/trialEndsAt):
// a reminder ~2 days before it ends and a notice when it has ended. Each is
// claimed with a conditional update first, so it goes out at most once even
// if the hourly job and a dashboard visit race.

const REMINDER_LEAD_MS = 2 * 24 * 60 * 60 * 1000;

// Users who subscribed through Lemon Squeezy have their trial cleared by the
// webhook; this is just a guard in case one is still set.
const OPEN_SUB_STATUSES = new Set(['on_trial', 'active', 'past_due', 'cancelled', 'paused', 'unpaid']);

function hasOpenSubscription(u: { lsSubscriptionId: string | null; lsStatus: string | null }): boolean {
  return !!u.lsSubscriptionId && !!u.lsStatus && OPEN_SUB_STATUSES.has(u.lsStatus);
}

// Ends an expired trial (back to the stored plan) and emails the user once.
// Called from GET /api/auth/me and from the hourly job. Never throws.
export async function expireTrial(userId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, suspended: true,
        trialPlan: true, trialEndsAt: true, lsSubscriptionId: true, lsStatus: true,
      },
    });
    if (!user?.trialPlan || !user.trialEndsAt || user.trialEndsAt > new Date()) return;

    const claimed = await prisma.user.updateMany({
      where: { id: user.id, trialPlan: { not: null }, trialEndsAt: { lte: new Date() } },
      data: { trialPlan: null, trialEndsAt: null, trialEndedEmailSentAt: new Date() },
    });
    if (claimed.count !== 1) return; // already expired elsewhere

    if (user.suspended || hasOpenSubscription(user)) return;
    void sendMail(user.email, trialEndedEmail(user)).then((ok) => {
      if (ok) console.log(`[Trial] ended email sent to user ${user.id}`);
    });
  } catch (err) {
    console.error('[Trial] expire failed', userId, err);
  }
}

export async function runTrialLifecycle(): Promise<void> {
  const now = new Date();

  const endingSoon = await prisma.user.findMany({
    where: {
      trialPlan: { not: null },
      trialEndsAt: { gt: now, lte: new Date(now.getTime() + REMINDER_LEAD_MS) },
      trialReminderSentAt: null,
      suspended: false,
    },
    select: { id: true, email: true, name: true, trialEndsAt: true, lsSubscriptionId: true, lsStatus: true },
  });

  for (const user of endingSoon) {
    if (!user.trialEndsAt || hasOpenSubscription(user)) continue;
    const claimed = await prisma.user.updateMany({
      where: { id: user.id, trialReminderSentAt: null },
      data: { trialReminderSentAt: new Date() },
    });
    if (claimed.count !== 1) continue;
    const ok = await sendMail(user.email, trialEndingEmail({ name: user.name, trialEndsAt: user.trialEndsAt }));
    console.log(`[Trial] reminder ${ok ? 'sent' : 'FAILED'} for user ${user.id}`);
  }

  const expired = await prisma.user.findMany({
    where: { trialPlan: { not: null }, trialEndsAt: { lte: now } },
    select: { id: true },
  });
  for (const user of expired) {
    await expireTrial(user.id);
  }
}
