import { prisma } from '../config/database';
import { fetchCampaignSpend } from './metaAdsSync';

// Pulls today's spend from one connected Meta ad account and applies it to
// any AdFlow campaign whose externalCampaignId matches. Shared between the
// manual "Sync now" API route and the background scheduler below.
export async function syncMetaConnection(connectionId: string): Promise<{ updated: number; seen: number }> {
  const conn = await prisma.adAccountConnection.findUnique({ where: { id: connectionId } });
  if (!conn) throw new Error('Connection not found');

  const spendByCampaign = await fetchCampaignSpend(conn.accessToken, conn.accountId);

  const linkedCampaigns = await prisma.campaign.findMany({
    where: { userId: conn.userId, externalCampaignId: { in: Object.keys(spendByCampaign) } },
  });

  let updated = 0;
  for (const c of linkedCampaigns) {
    const spend = spendByCampaign[c.externalCampaignId!];
    if (spend === undefined) continue;
    await prisma.campaign.update({ where: { id: c.id }, data: { cost: spend, costSyncedAt: new Date() } });
    updated++;
  }

  await prisma.adAccountConnection.update({
    where: { id: conn.id },
    data: { lastSyncAt: new Date(), lastSyncError: null },
  });

  return { updated, seen: Object.keys(spendByCampaign).length };
}

// Runs on a schedule (see index.ts) to keep campaign cost fresh without the
// user needing to manually click "Sync now" constantly.
export async function syncAllMetaAdAccounts(): Promise<void> {
  const connections = await prisma.adAccountConnection.findMany({ where: { platform: 'meta' } });
  for (const conn of connections) {
    try {
      const result = await syncMetaConnection(conn.id);
      if (result.updated > 0) {
        console.log(`[AdAccountSync] ${conn.accountName ?? conn.accountId}: updated ${result.updated} campaign(s)`);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error('[AdAccountSync] failed for connection', conn.id, message);
      await prisma.adAccountConnection.update({ where: { id: conn.id }, data: { lastSyncError: message } }).catch(() => {});
    }
  }
}
