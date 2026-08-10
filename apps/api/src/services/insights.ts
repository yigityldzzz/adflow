import { prisma } from '../config/database';

export interface Insight {
  type: 'info' | 'warning' | 'error' | 'success';
  campaign: string | null;
  icon: string;
  title: string;
  description: string;
  metric: string;
}

export async function generateInsights(userId: string): Promise<Insight[]> {
  const insights: Insight[] = [];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const campaigns = await prisma.campaign.findMany({
    where: { userId, status: 'ACTIVE' },
    include: {
      clicks: { where: { timestamp: { gte: sevenDaysAgo } } },
      links: {
        include: {
          conversions: { where: { timestamp: { gte: sevenDaysAgo } } },
        },
      },
    },
  });

  for (const campaign of campaigns) {
    const clicks7d = campaign.clicks.length;
    const conversions7d = campaign.links.flatMap((l) => l.conversions).length;
    const revenue7d = campaign.links
      .flatMap((l) => l.conversions)
      .reduce((s, c) => s + c.value, 0);

    // Get previous 7-day click count
    const prevClicks = await prisma.click.count({
      where: {
        campaignId: campaign.id,
        timestamp: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
      },
    });

    // Ad fatigue detection: >30% CTR drop
    if (prevClicks > 10 && clicks7d < prevClicks * 0.7) {
      insights.push({
        type: 'warning',
        campaign: campaign.name,
        icon: 'trending-down',
        title: `Ad Fatigue Detected — ${campaign.name}`,
        description: `Click volume dropped ${Math.round(
          (1 - clicks7d / prevClicks) * 100
        )}% vs last week. Consider refreshing creatives.`,
        metric: `${prevClicks} → ${clicks7d} clicks`,
      });
    }

    // High CPA warning
    const spend = campaign.budget ?? 0;
    if (conversions7d > 0 && spend > 0) {
      const cpa = spend / conversions7d;
      if (cpa > 50) {
        insights.push({
          type: 'warning',
          campaign: campaign.name,
          icon: 'dollar-sign',
          title: `High CPA — ${campaign.name}`,
          description: `Cost per acquisition is $${cpa.toFixed(
            2
          )}, which is above target. Review targeting or creative.`,
          metric: `CPA: $${cpa.toFixed(2)}`,
        });
      }
    }

    // Zero conversions despite significant clicks
    if (clicks7d > 20 && conversions7d === 0) {
      insights.push({
        type: 'error',
        campaign: campaign.name,
        icon: 'alert-circle',
        title: `Zero Conversions — ${campaign.name}`,
        description: `${clicks7d} clicks but no conversions in the last 7 days. Check your landing page or offer.`,
        metric: `${clicks7d} clicks, 0 conversions`,
      });
    }

    // Winning campaign / high ROAS
    if (conversions7d > 0 && revenue7d > 0) {
      const roas = revenue7d / (campaign.budget ?? 1);
      if (roas > 3) {
        insights.push({
          type: 'success',
          campaign: campaign.name,
          icon: 'zap',
          title: `Top Performer — ${campaign.name}`,
          description: `This campaign is delivering ${roas.toFixed(
            1
          )}x ROAS. Consider scaling the budget.`,
          metric: `ROAS: ${roas.toFixed(1)}x`,
        });
      }
    }
  }

  // Bot traffic alert
  const totalClicks7d = await prisma.click.count({
    where: { userId, timestamp: { gte: sevenDaysAgo } },
  });
  const botClicks7d = await prisma.click.count({
    where: { userId, isBot: true, timestamp: { gte: sevenDaysAgo } },
  });

  if (totalClicks7d > 0 && botClicks7d / totalClicks7d > 0.2) {
    insights.push({
      type: 'warning',
      campaign: null,
      icon: 'shield-alert',
      title: 'High Bot Traffic Detected',
      description: `${Math.round(
        (botClicks7d / totalClicks7d) * 100
      )}% of your traffic appears to be bots. Your ad spend may be wasted on invalid clicks.`,
      metric: `${botClicks7d}/${totalClicks7d} bot clicks`,
    });
  }

  // Device insight: mobile vs desktop conversion rates
  const mobileClicks = await prisma.click.count({
    where: { userId, device: 'mobile', timestamp: { gte: sevenDaysAgo } },
  });
  const desktopClicks = await prisma.click.count({
    where: { userId, device: 'desktop', timestamp: { gte: sevenDaysAgo } },
  });

  if (mobileClicks > 0 && desktopClicks > 0) {
    const mobileConvs = await prisma.conversion.count({
      where: {
        userId,
        timestamp: { gte: sevenDaysAgo },
        click: { device: 'mobile' },
      },
    });
    const desktopConvs = await prisma.conversion.count({
      where: {
        userId,
        timestamp: { gte: sevenDaysAgo },
        click: { device: 'desktop' },
      },
    });

    const mobileCR = mobileClicks > 0 ? (mobileConvs / mobileClicks) * 100 : 0;
    const desktopCR =
      desktopClicks > 0 ? (desktopConvs / desktopClicks) * 100 : 0;

    if (mobileCR > desktopCR * 1.3 && mobileClicks > 20) {
      insights.push({
        type: 'info',
        campaign: null,
        icon: 'smartphone',
        title: 'Mobile Converts Better',
        description: `Mobile traffic converts ${Math.round(
          mobileCR - desktopCR
        )}% better than desktop. Consider optimizing bids for mobile.`,
        metric: `Mobile ${mobileCR.toFixed(1)}% vs Desktop ${desktopCR.toFixed(1)}%`,
      });
    }
  }

  return insights.slice(0, 6);
}
