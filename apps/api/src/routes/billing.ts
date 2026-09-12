import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Plan } from '@prisma/client';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createCheckoutUrl, planForVariant, verifyWebhookSignature } from '../services/lemonsqueezy';

const router = Router();
const webhookRouter = Router();

// ── POST /api/billing/checkout — authenticated, returns a Lemon Squeezy ─────
// checkout URL for the requested plan. The frontend redirects the browser
// there; Lemon Squeezy handles card entry + the 7-day-trial-then-charge flow.
const checkoutSchema = z.object({ plan: z.enum(['PRO', 'TEAM']) });

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

const DOWNGRADE_STATUSES = new Set(['cancelled', 'expired', 'paused', 'unpaid']);

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

  if (DOWNGRADE_STATUSES.has(status)) {
    await prisma.user.update({
      where: { id: user.id },
      data: { plan: Plan.FREE, lsStatus: status },
    });
  } else {
    const mappedPlan = planForVariant(variantId);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(mappedPlan ? { plan: mappedPlan as Plan } : {}),
        // A real Lemon Squeezy subscription supersedes our own no-card
        // registration trial — clear it so getEffectivePlan() reads `plan`.
        trialPlan: null,
        trialEndsAt: null,
        lsCustomerId,
        lsSubscriptionId,
        lsVariantId: variantId,
        lsStatus: status,
      },
    });
  }

  res.json({ ok: true });
});

export default router;
export { webhookRouter };
