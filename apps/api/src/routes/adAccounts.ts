import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getTeamUserIds } from '../services/team';
import {
  buildAuthorizeUrl,
  exchangeCodeForLongLivedToken,
  listAdAccounts,
  listCampaigns,
} from '../services/metaAdsSync';
import { syncMetaConnection } from '../services/adAccountScheduler';

const router = Router();

const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes to complete the OAuth round trip

function signState(userId: string): string {
  const secret = process.env.JWT_SECRET ?? '';
  const payload = JSON.stringify({ userId, ts: Date.now() });
  const b64 = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

function verifyState(state: string): { userId: string } | null {
  const secret = process.env.JWT_SECRET ?? '';
  const [b64, sig] = state.split('.');
  if (!b64 || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', secret).update(b64).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
  try {
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8')) as { userId: string; ts: number };
    if (Date.now() - payload.ts > STATE_MAX_AGE_MS) return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

// GET /api/ad-accounts/meta/connect-url — authenticated; returns the Meta OAuth URL to redirect the browser to
router.get('/meta/connect-url', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const state = signState(req.user!.id);
    const url = buildAuthorizeUrl(state);
    res.json({ url });
  } catch (e) {
    res.status(503).json({ error: e instanceof Error ? e.message : 'Meta Ads integration is not configured yet' });
  }
});

// GET /api/ad-accounts/meta/callback — public (Meta redirects the browser here directly, no auth header available)
router.get('/meta/callback', async (req: Request, res: Response): Promise<void> => {
  const webBase = process.env.WEB_BASE_URL ?? 'https://adflow.digitaladexpert.de';
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;
  const oauthError = req.query.error_description as string | undefined;

  if (oauthError) {
    res.redirect(`${webBase}/settings?meta_error=${encodeURIComponent(oauthError)}`);
    return;
  }
  if (!code || !state) {
    res.redirect(`${webBase}/settings?meta_error=missing_code_or_state`);
    return;
  }

  const verified = verifyState(state);
  if (!verified) {
    res.redirect(`${webBase}/settings?meta_error=invalid_or_expired_state`);
    return;
  }

  try {
    const { accessToken, expiresInSeconds } = await exchangeCodeForLongLivedToken(code);
    const accounts = await listAdAccounts(accessToken);

    const tokenExpiresAt = expiresInSeconds ? new Date(Date.now() + expiresInSeconds * 1000) : null;

    for (const acc of accounts) {
      await prisma.adAccountConnection.upsert({
        where: { userId_platform_accountId: { userId: verified.userId, platform: 'meta', accountId: acc.id } },
        create: {
          userId: verified.userId,
          platform: 'meta',
          accountId: acc.id,
          accountName: acc.name,
          accessToken,
          tokenExpiresAt,
        },
        update: {
          accountName: acc.name,
          accessToken,
          tokenExpiresAt,
        },
      });
    }

    res.redirect(`${webBase}/settings?connected=meta&accounts=${accounts.length}`);
  } catch (e) {
    res.redirect(`${webBase}/settings?meta_error=${encodeURIComponent(e instanceof Error ? e.message : 'connection_failed')}`);
  }
});

// GET /api/ad-accounts — list connections (team-scoped)
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const teamIds = await getTeamUserIds(req.user!.id);
  const connections = await prisma.adAccountConnection.findMany({
    where: { userId: { in: teamIds } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, platform: true, accountId: true, accountName: true,
      lastSyncAt: true, lastSyncError: true, tokenExpiresAt: true, createdAt: true,
    },
  });
  res.json({ connections });
});

// GET /api/ad-accounts/:id/campaigns — live-fetch this ad account's Meta campaigns (for linking to an AdFlow campaign)
router.get('/:id/campaigns', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const teamIds = await getTeamUserIds(req.user!.id);
  const conn = await prisma.adAccountConnection.findFirst({ where: { id: req.params.id, userId: { in: teamIds } } });
  if (!conn) { res.status(404).json({ error: 'Connection not found' }); return; }

  try {
    const campaigns = await listCampaigns(conn.accessToken, conn.accountId);
    res.json({ campaigns });
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : 'Failed to fetch campaigns from Meta' });
  }
});

// POST /api/ad-accounts/:id/sync — pull today's spend and update matched AdFlow campaigns' cost
router.post('/:id/sync', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const teamIds = await getTeamUserIds(req.user!.id);
  const conn = await prisma.adAccountConnection.findFirst({ where: { id: req.params.id, userId: { in: teamIds } } });
  if (!conn) { res.status(404).json({ error: 'Connection not found' }); return; }

  try {
    const result = await syncMetaConnection(conn.id);
    res.json({ ok: true, campaignsUpdated: result.updated, campaignsSeenInMeta: result.seen });
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : 'Sync failed' });
  }
});

// DELETE /api/ad-accounts/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const teamIds = await getTeamUserIds(req.user!.id);
  await prisma.adAccountConnection.deleteMany({ where: { id: req.params.id, userId: { in: teamIds } } });
  res.json({ ok: true });
});

export default router;
