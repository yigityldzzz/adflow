import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const conditionCheckSchema = z.object({
  condition: z.enum(['country', 'device', 'os', 'language']),
  operator: z.enum(['is', 'is_not', 'contains']),
  value: z.string(),
});

const ruleSchema = z.object({
  // New format — multiple conditions combined with AND logic.
  conditions: z.array(conditionCheckSchema).optional(),
  // Legacy format — single condition, kept for backward compatibility.
  condition: z.enum(['country', 'device', 'os', 'language', 'always']).optional(),
  operator: z.enum(['is', 'is_not', 'contains']).optional(),
  value: z.string().optional(),
  weight: z.number().min(1).max(100).optional(),
  offerId: z.string().optional(),
  landerId: z.string().optional(),
  redirectUrl: z.string().optional(),
}).refine(
  (r) => (r.conditions && r.conditions.length > 0) || r.condition,
  { message: 'Either conditions[] or a legacy condition field is required' }
);

const pathSchema = z.object({
  weight: z.number().min(1).max(100),
  landerId: z.string().optional(),
  offerId: z.string().optional(),
});

const createSchema = z.object({
  name: z.string().min(1),
  trafficSourceId: z.string().optional(),
  landerId: z.string().optional(),
  offerId: z.string().optional(),
  rules: z.array(ruleSchema).default([]),
  paths: z.array(pathSchema).default([]),
});

const updateSchema = createSchema.partial().extend({
  status: z.enum(['active', 'paused', 'archived']).optional(),
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const flows = await prisma.flow.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ flows });
  } catch {
    res.status(500).json({ error: 'Failed to fetch flows' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  try {
    const flow = await prisma.flow.create({
      data: { ...parsed.data, rules: parsed.data.rules as object[], paths: parsed.data.paths as object[], userId: req.user!.id },
    });
    res.status(201).json(flow);
  } catch {
    res.status(500).json({ error: 'Failed to create flow' });
  }
});

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  try {
    const result = await prisma.flow.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { ...parsed.data, rules: parsed.data.rules as object[] | undefined, paths: parsed.data.paths as object[] | undefined },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Not found' });
    const updated = await prisma.flow.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.flow.deleteMany({ where: { id: req.params.id, userId: req.user!.id } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

export default router;
