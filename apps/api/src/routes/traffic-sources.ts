import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { prisma } from '../config/database';
import { getTeamUserIds } from '../services/team';

const router = Router();

const createSchema = z.object({
  name:        z.string().min(1),
  platform:    z.enum(['meta', 'google', 'tiktok', 'snapchat', 'native', 'push', 'other']).default('other'),
  postbackUrl: z.string().url().optional().or(z.literal('')),
  costModel:   z.enum(['CPC', 'CPM', 'AUTO', 'FIXED']).default('CPC'),
  tags:        z.array(z.string()).default([]),
  // Meta CAPI fields
  pixelId:     z.string().optional().or(z.literal('')),
  accessToken: z.string().optional().or(z.literal('')),
  fbEventName: z.enum(['Purchase', 'Lead', 'CompleteRegistration', 'ViewContent', 'AddToCart', 'InitiateCheckout', 'Subscribe']).optional(),
  // TikTok/Snapchat CAPI event name (their own standard-event naming, reuses pixelId/accessToken above)
  eventName:   z.string().max(100).optional().or(z.literal('')),
});

const updateSchema = createSchema.partial().extend({
  status: z.enum(['active', 'paused', 'archived']).optional(),
});

router.use(authenticate);

router.get('/', async (req, res: Response) => {
  try {
    const teamIds = await getTeamUserIds((req as AuthRequest).user!.id);
    const sources = await prisma.trafficSource.findMany({
      where: { userId: { in: teamIds } },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { campaigns: true } } },
    });
    // Mask access token in list view
    const masked = sources.map(s => ({
      ...s,
      accessToken: s.accessToken ? '••••••' + s.accessToken.slice(-6) : null,
    }));
    res.json({ trafficSources: masked });
  } catch {
    res.status(500).json({ error: 'Failed to fetch traffic sources' });
  }
});

router.get('/:id', async (req, res: Response) => {
  try {
    const teamIds = await getTeamUserIds((req as AuthRequest).user!.id);
    const s = await prisma.trafficSource.findFirst({
      where: { id: req.params.id, userId: { in: teamIds } },
    });
    if (!s) return res.status(404).json({ error: 'Not found' });
    res.json({ ...s, accessToken: s.accessToken ? '••••••' + s.accessToken.slice(-6) : null });
  } catch {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

router.post('/', async (req, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  try {
    const source = await prisma.trafficSource.create({
      data: {
        ...parsed.data,
        userId:      (req as AuthRequest).user!.id,
        postbackUrl: parsed.data.postbackUrl || null,
        pixelId:     parsed.data.pixelId || null,
        accessToken: parsed.data.accessToken || null,
        fbEventName: parsed.data.fbEventName || null,
        eventName:   parsed.data.eventName || null,
      },
    });
    res.status(201).json(source);
  } catch {
    res.status(500).json({ error: 'Failed to create traffic source' });
  }
});

router.patch('/:id', async (req, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  try {
    // Only update accessToken if explicitly provided (not masked)
    const data: Record<string, unknown> = { ...parsed.data };
    if (typeof data.accessToken === 'string' && data.accessToken.startsWith('••')) {
      delete data.accessToken; // keep existing token
    }
    if ("postbackUrl" in parsed.data) data.postbackUrl = parsed.data.postbackUrl || null;
    if (data.pixelId === '') data.pixelId = null;
    if (data.eventName === '') data.eventName = null;

    const teamIds = await getTeamUserIds((req as AuthRequest).user!.id);
    const result = await prisma.trafficSource.updateMany({
      where: { id: req.params.id, userId: { in: teamIds } },
      data,
    });
    if (result.count === 0) return res.status(404).json({ error: 'Not found' });
    const updated = await prisma.trafficSource.findUnique({ where: { id: req.params.id } });
    res.json({ ...updated, accessToken: updated?.accessToken ? '••••••' + updated.accessToken.slice(-6) : null });
  } catch {
    res.status(500).json({ error: 'Failed to update' });
  }
});

router.delete('/:id', async (req, res: Response) => {
  try {
    const teamIds = await getTeamUserIds((req as AuthRequest).user!.id);
    await prisma.trafficSource.deleteMany({
      where: { id: req.params.id, userId: { in: teamIds } },
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

export default router;
