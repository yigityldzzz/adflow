import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { prisma } from '../config/database';
import { getTeamUserIds } from '../services/team';


const router = Router();

const createSchema = z.object({
  name: z.string().min(1),
  url: z.string().min(1),
  countryLabel: z.string().default('Global'),
  tags: z.array(z.string()).default([]),
});

const updateSchema = createSchema.partial().extend({
  status: z.enum(['active', 'paused', 'archived']).optional(),
});

router.use(authenticate);

router.get('/', async (req, res: Response) => {
  try {
    const teamIds = await getTeamUserIds((req as AuthRequest).user!.id);
    const landers = await prisma.lander.findMany({
      where: { userId: { in: teamIds } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ landers });
  } catch {
    res.status(500).json({ error: 'Failed to fetch landers' });
  }
});

router.post('/', async (req, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  try {
    const lander = await prisma.lander.create({
      data: { ...parsed.data, userId: (req as AuthRequest).user!.id },
    });
    res.status(201).json(lander);
  } catch {
    res.status(500).json({ error: 'Failed to create lander' });
  }
});

router.patch('/:id', async (req, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  try {
    const teamIds = await getTeamUserIds((req as AuthRequest).user!.id);
    const result = await prisma.lander.updateMany({
      where: { id: req.params.id, userId: { in: teamIds } },
      data: parsed.data,
    });
    if (result.count === 0) return res.status(404).json({ error: 'Not found' });
    const updated = await prisma.lander.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update' });
  }
});

router.delete('/:id', async (req, res: Response) => {
  try {
    const teamIds = await getTeamUserIds((req as AuthRequest).user!.id);
    await prisma.lander.deleteMany({ where: { id: req.params.id, userId: { in: teamIds } } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

export default router;
