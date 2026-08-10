import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { prisma } from '../config/database';


const router = Router();

const createSchema = z.object({
  name: z.string().min(1),
  url: z.string().min(1),
  countryLabel: z.string().default('Global'),
  affiliateNetwork: z.string().optional(),
  tags: z.array(z.string()).default([]),
  payout: z.enum(['auto', 'manual']).default('auto'),
  payoutValue: z.number().min(0).optional(),
  currency: z.string().default('USD'),
  trackingMethod: z.enum(['S2S', 'Script', 'Pixel', 'Upload']).default('S2S'),
});

const updateSchema = createSchema.partial().extend({
  status: z.enum(['active', 'paused', 'archived']).optional(),
});

router.use(authenticate);

router.get('/', async (req, res: Response) => {
  try {
    const offers = await prisma.offer.findMany({
      where: { userId: (req as AuthRequest).user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ offers });
  } catch {
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

router.post('/', async (req, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  try {
    const offer = await prisma.offer.create({
      data: { ...parsed.data, userId: (req as AuthRequest).user!.id },
    });
    res.status(201).json(offer);
  } catch {
    res.status(500).json({ error: 'Failed to create offer' });
  }
});

router.patch('/:id', async (req, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  try {
    const result = await prisma.offer.updateMany({
      where: { id: req.params.id, userId: (req as AuthRequest).user!.id },
      data: parsed.data,
    });
    if (result.count === 0) return res.status(404).json({ error: 'Not found' });
    const updated = await prisma.offer.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update' });
  }
});

router.delete('/:id', async (req, res: Response) => {
  try {
    await prisma.offer.deleteMany({ where: { id: req.params.id, userId: (req as AuthRequest).user!.id } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

export default router;
