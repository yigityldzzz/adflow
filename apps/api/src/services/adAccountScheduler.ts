import { prisma } from '../config/database';
import { fetchCampaignDailySpend } from './metaAdsSync';

// Pulls the last 30 days of daily spend from one connected Meta ad account
// and writes it into CampaignSpend (one row per campaign per day, set to
// Meta's exact number for that day) for any AdFlow campaign whose
// externalCampaignId matches. Campaign.cost is then recomputed as the sum
// of all known CampaignSpend for that campaign, so it stays a valid
// lifetime total while CampaignSpend supports date-range filtering.
// Shared between the manual "Sync now" API route and the scheduler below.
export async function syncMetaConnection(connectionId: string): Promise<{ updated: number; seen: number }> {
  const conn = await prisma.adAccountConnection.findUnique({ where: { id: connectionId } });
  if (!conn) throw new Error('Connection not found');

  const dailySpend = await fetchCampaignDailySpend(conn.accessToken, conn.accountId, 30);

  const externalIds = Array.from(new Set(dailySpend.map((d) => d.campaignId)));
  const linkedCampaigns = await prisma.campaign.findMany({
    where: { userId: conn.userId, externalCampaignId: { in: externalIds } },
  });
  const campaignByExternalId = new Map(linkedCampaigns.map((c) => [c.externalCampaignId!, c]));

  let updated = 0;
  const touchedCampaignIds = new Set<string>();
  for (const row of dailySpend) {
    const campaign = campaignByExternalId.get(row.campaignId);
    if (!campaign) continue;
    const date = new Date(row.date);
    date.setUTCHours(0, 0, 0, 0);
    await prisma.campaignSpend.upsert({
      where: { campaignId_date: { campaignId: campaign.id, date } },
      create: { campaignId: campaign.id, date, cost: row.spend },
      update: { cost: row.spend },
    });
    touchedCampaignIds.add(campaign.id);
  }

  for (const campaignId of touchedCampaignIds) {
    const total = await prisma.campaignSpend.aggregate({ where: { campaignId }, _sum: { cost: true } });
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { cost: total._sum.cost ?? 0, costSyncedAt: new Date() },
    });
    updated++;
  }

  await prisma.adAccountConnection.update({
    where: { id: conn.id },
    data: { lastSyncAt: new Date(), lastSyncError: null },
  });

  return { updated, seen: externalIds.length };
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
