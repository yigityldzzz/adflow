import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Plan } from '@prisma/client';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createCheckoutUrl, getSubscription, planForVariant, verifyWebhookSignature } from '../services/lemonsqueezy';
import { limitFor } from '../config/planLimits';
import { loadEffectivePlan, startOfCurrentMonth } from '../services/planAccess';
import { getTeamUserIds } from '../services/team';

const router = Router();
const webhookRouter = Router();

// ── POST /api/billing/checkout — authenticated, returns a Lemon Squeezy ─────
// checkout URL for the requested plan. The frontend redirects the browser
// there; Lemon Squeezy handles card entry + the 7-day-trial-then-charge flow.
const checkoutSchema = z.object({ plan: z.enum(['PRO', 'TEAM']) });

// `cancelled` is NOT a downgrade: Lemon Squeezy keeps a cancelled
// subscription running until the end of the period the customer already paid
// for (or the end of the trial), then sends `subscription_expired`. Only the
// statuses below mean access has actually ended.
const DOWNGRADE_STATUSES = new Set(['expired', 'paused', 'unpaid']);

// Statuses where the user still has a subscription to manage (or resume) in
// the Lemon Squeezy customer portal — starting a second checkout would bill
// them twice.
const OPEN_STATUSES = new Set(['on_trial', 'active', 'past_due', 'cancelled', 'paused', 'unpaid']);

// Applies a subscription's state to our user row. Shared by the webhook and
// GET /subscription (which re-syncs in case a webhook was missed).
async function applySubscriptionState(
  userId: string,
  sub: { id: string; customerId?: string; variantId: string; status: string },
): Promise<void> {
  if (DOWNGRADE_STATUSES.has(sub.status)) {
    await prisma.user.update({
      where: { id: userId },
      data: { plan: Plan.FREE, lsStatus: sub.status },
    });
    return;
  }

  const mappedPlan = planForVariant(sub.variantId);
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(mappedPlan ? { plan: mappedPlan as Plan } : {}),
      // A real Lemon Squeezy subscription supersedes our own no-card
      // registration trial — clear it so getEffectivePlan() reads `plan`.
      trialPlan: null,
      trialEndsAt: null,
      ...(sub.customerId ? { lsCustomerId: sub.customerId } : {}),
      lsSubscriptionId: sub.id,
      lsVariantId: sub.variantId,
      lsStatus: sub.status,
    },
  });
}

router.post('/checkout', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = checkoutSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'plan must be PRO or TEAM' });
    return;
  }

  const variantId =
    parse.data.plan === 'PRO'
      ? process.env.LEMONSQUEEZY_VARIANT_PRO
      : process.env.LEMONSQUEEZY_VARIANT_TEAM;

  if (!variantId) {
    res.status(500).json({ error: 'Billing not configured for this plan' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (user.lsSubscriptionId && user.lsStatus && OPEN_STATUSES.has(user.lsStatus)) {
    res.status(409).json({ error: 'You already have a subscription. Manage it under Settings → Plan & Billing.' });
    return;
  }

  try {
    const url = await createCheckoutUrl({
      variantId,
      userId: user.id,
      email: user.email,
      name: user.name,
    });
    res.json({ url });
  } catch (err) {
    console.error('[billing/checkout]', err);
    res.status(502).json({ error: 'Could not create checkout session' });
  }
});

// ── GET /api/billing/subscription — authenticated ─────────────────────────────
// Current subscription for the Settings → Plan & Billing tab, read live from
// Lemon Squeezy (renewal date, card, signed customer-portal link). Falls back
// to the stored status if Lemon Squeezy can't be reached.
router.get('/subscription', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (!user.lsSubscriptionId) {
    res.json({ subscription: null });
    return;
  }

  const stored = {
    status: user.lsStatus ?? 'unknown',
    plan: user.lsVariantId ? planForVariant(user.lsVariantId) : null,
    renewsAt: null as string | null,
    endsAt: null as string | null,
    trialEndsAt: null as string | null,
    cardBrand: null as string | null,
    cardLastFour: null as string | null,
    customerPortalUrl: null as string | null,
    updatePaymentMethodUrl: null as string | null,
    live: false,
  };

  try {
    const sub = await getSubscription(user.lsSubscriptionId);
    if (!sub) {
      res.json({ subscription: stored });
      return;
    }

    if (sub.status !== user.lsStatus || sub.variantId !== user.lsVariantId) {
      await applySubscriptionState(user.id, { id: user.lsSubscriptionId, variantId: sub.variantId, status: sub.status });
    }

    res.json({
      subscription: {
        status: sub.status,
        plan: planForVariant(sub.variantId),
        renewsAt: sub.renewsAt,
        endsAt: sub.endsAt,
        trialEndsAt: sub.trialEndsAt,
        cardBrand: sub.cardBrand,
        cardLastFour: sub.cardLastFour,
        customerPortalUrl: sub.customerPortalUrl,
        updatePaymentMethodUrl: sub.updatePaymentMethodUrl,
        live: true,
      },
    });
  } catch (err) {
    console.error('[billing/subscription]', err);
    res.json({ subscription: stored });
  }
});

// ── GET /api/billing/usage — authenticated ──────────────────────────────────
// Current usage against the plan limits, counted the same way the limits are
// enforced (team-wide; clicks since the start of the month as in /r/:slug).
router.get('/usage', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const plan = await loadEffectivePlan(userId);
  const limits = limitFor(plan);
  const teamIds = await getTeamUserIds(userId);
  const periodStart = startOfCurrentMonth();

  const [campaigns, links, clicksThisMonth] = await Promise.all([
    prisma.campaign.count({ where: { userId: { in: teamIds } } }),
    prisma.trackingLink.count({ where: { userId: { in: teamIds } } }),
    prisma.click.count({ where: { userId: { in: teamIds }, timestamp: { gte: periodStart } } }),
  ]);

  res.json({
    plan,
    periodStart,
    usage: { campaigns, links, clicksThisMonth },
    limits: {
      maxCampaigns: limits.maxCampaigns,
      maxLinks: limits.maxLinks,
      maxClicksPerMonth: limits.maxClicksPerMonth,
      retentionDays: limits.retentionDays,
    },
  });
});

// ── POST /api/webhooks/lemonsqueezy — public, HMAC-verified ─────────────────
// Mounted separately (not under authenticate) since Lemon Squeezy calls this
// directly. index.ts captures the raw request body via express.json's
// `verify` hook so we can check the signature before trusting the payload.
interface LsWebhookPayload {
  meta: {
    event_name: string;
    custom_data?: { user_id?: string };
  };
  data: {
    id: string;
    type: string;
    attributes: {
      customer_id: number;
      variant_id: number;
      status: string;
    };
  };
}

webhookRouter.post('/lemonsqueezy', async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers['x-signature'] as string | undefined;
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;

  if (!rawBody || !verifyWebhookSignature(rawBody, signature)) {
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  const payload = req.body as LsWebhookPayload;
  const eventName = payload.meta?.event_name;
  const attrs = payload.data?.attributes;

  if (!eventName || !attrs || payload.data?.type !== 'subscriptions') {
    res.json({ ok: true, ignored: true });
    return;
  }

  const lsSubscriptionId = payload.data.id;
  const lsCustomerId = String(attrs.customer_id);
  const variantId = String(attrs.variant_id);
  const status = attrs.status;
  const userIdFromCustomData = payload.meta.custom_data?.user_id;

  const user = userIdFromCustomData
    ? await prisma.user.findUnique({ where: { id: userIdFromCustomData } })
    : await prisma.user.findFirst({ where: { lsSubscriptionId } });

  if (!user) {
    console.warn('[webhooks/lemonsqueezy] no matching user for subscription', lsSubscriptionId);
    res.json({ ok: true, ignored: true });
    return;
  }

  // A late event about an older, already-replaced subscription must not
  // downgrade a user who has since subscribed again.
  if (user.lsSubscriptionId && user.lsSubscriptionId !== lsSubscriptionId && DOWNGRADE_STATUSES.has(status)) {
    res.json({ ok: true, ignored: true });
    return;
  }

  await applySubscriptionState(user.id, { id: lsSubscriptionId, customerId: lsCustomerId, variantId, status });

  res.json({ ok: true });
});

export default router;
export { webhookRouter };
