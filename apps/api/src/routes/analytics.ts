import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateInsights } from '../services/insights';
import { getTeamUserIds } from '../services/team';

const router = Router();
router.use(authenticate);

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

function parseDateRange(query: Record<string, string | undefined>): { start: Date; end: Date } {
  const now = new Date();
  if (query.from && query.to) {
    const start = new Date(query.from);
    const end = new Date(query.to);
    end.setHours(23, 59, 59, 999);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) return { start, end };
  }
  const preset = query.preset ?? 'today';
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  switch (preset) {
    case 'today': { const end = new Date(today); end.setHours(23,59,59,999); return { start: today, end }; }
    case 'yesterday': { const s = new Date(today); s.setDate(s.getDate()-1); const e = new Date(s); e.setHours(23,59,59,999); return { start: s, end: e }; }
    case 'last7': { const s = new Date(today); s.setDate(s.getDate()-6); const e = new Date(today); e.setHours(23,59,59,999); return { start: s, end: e }; }
    case 'last30': { const s = new Date(today); s.setDate(s.getDate()-29); const e = new Date(today); e.setHours(23,59,59,999); return { start: s, end: e }; }
    case 'thismonth': { const s = new Date(today.getFullYear(), today.getMonth(), 1); const e = new Date(today); e.setHours(23,59,59,999); return { start: s, end: e }; }
    default: { const s = new Date(today); s.setDate(s.getDate()-29); const e = new Date(today); e.setHours(23,59,59,999); return { start: s, end: e }; }
  }
}

// ── GET /api/analytics/dashboard ─────────────────────────────────────────────
router.get('/dashboard', async (req: AuthRequest, res: Response): Promise<void> => {
  const teamIds = await getTeamUserIds(req.user!.id);
  const { start, end } = parseDateRange(req.query as Record<string, string>);
  const duration = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - duration);
  const prevEnd = new Date(start.getTime() - 1);

  const [clicks, prevClicks, conversions, prevConversions, campaigns] = await Promise.all([
    prisma.click.findMany({
      where: { userId: { in: teamIds }, isBot: false, timestamp: { gte: start, lte: end } },
      select: {
        timestamp: true, visitorId: true, country: true, countryCode: true,
        utmSource: true, device: true, os: true, browser: true, isSuspicious: true,
      },
    }),
    prisma.click.count({ where: { userId: { in: teamIds }, isBot: false, timestamp: { gte: prevStart, lte: prevEnd } } }),
    prisma.conversion.findMany({
      where: { userId: { in: teamIds }, timestamp: { gte: start, lte: end } },
      select: {
        value: true, timestamp: true,
        click: { select: { country: true, countryCode: true, utmSource: true, device: true, os: true } },
      },
    }),
    prisma.conversion.aggregate({
      where: { userId: { in: teamIds }, timestamp: { gte: prevStart, lte: prevEnd } },
      _count: true, _sum: { value: true },
    }),
    prisma.campaign.findMany({
      where: { userId: { in: teamIds } },
      select: {
        id: true, name: true, source: true, status: true, cost: true,
        trafficSourceId: true,
        trafficSource: { select: { id: true, name: true, platform: true } },
        links: {
          select: {
            id: true,
            _count: { select: { clicks: { where: { isBot: false, timestamp: { gte: start, lte: end } } } } },
            conversions: { where: { timestamp: { gte: start, lte: end } }, select: { value: true } },
          },
        },
        _count: { select: { clicks: { where: { isBot: false, timestamp: { gte: start, lte: end } } } } },
      },
    }),
  ]);

  const totalClicks = clicks.length;
  const uniqueVisitors = new Set(clicks.map((c) => c.visitorId)).size;
  const suspiciousClicks = clicks.filter((c) => c.isSuspicious).length;
  const suspiciousRate = totalClicks > 0 ? Math.round((suspiciousClicks / totalClicks) * 100 * 10) / 10 : 0;
  const revenue = conversions.reduce((s, c) => s + c.value, 0);
  const totalConversions = conversions.length;
  const totalCost = campaigns.reduce((s, c) => s + (c.cost ?? 0), 0);
  const profit = revenue - totalCost;
  const roi = totalCost > 0 ? ((profit / totalCost) * 100) : null;
  const roas = totalCost > 0 && revenue > 0 ? revenue / totalCost : null;
  const cr = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
  const prevRevenue = prevConversions._sum.value ?? 0;

  // ── Timeline ────────────────────────────────────────────────────────────────
  const clickMap = new Map<string, number>();
  const uniqueMap = new Map<string, Set<string>>();
  const convMap = new Map<string, number>();
  const revenueMap = new Map<string, number>();
  for (const click of clicks) {
    const key = click.timestamp.toISOString().slice(0, 10);
    clickMap.set(key, (clickMap.get(key) ?? 0) + 1);
    if (!uniqueMap.has(key)) uniqueMap.set(key, new Set());
    uniqueMap.get(key)!.add(click.visitorId);
  }
  for (const conv of conversions) {
    const key = conv.timestamp.toISOString().slice(0, 10);
    convMap.set(key, (convMap.get(key) ?? 0) + 1);
    revenueMap.set(key, (revenueMap.get(key) ?? 0) + conv.value);
  }
  const dayCount = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  const timeline = [];
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const key = d.toISOString().slice(0, 10);
    timeline.push({
      date: key,
      clicks: clickMap.get(key) ?? 0,
      uniqueVisitors: uniqueMap.get(key)?.size ?? 0,
      conversions: convMap.get(key) ?? 0,
      revenue: Math.round((revenueMap.get(key) ?? 0) * 100) / 100,
    });
  }

  // ── Details: Campaigns ──────────────────────────────────────────────────────
  const campaignDetails = campaigns.map((c) => {
    const cClicks = c._count.clicks;
    const cConversions = c.links.flatMap((l) => l.conversions);
    const cRevenue = cConversions.reduce((s, cv) => s + cv.value, 0);
    const cCost = c.cost ?? 0;
    const cProfit = cRevenue - cCost;
    const cROI = cCost > 0 ? (cProfit / cCost) * 100 : null;
    const cCR = cClicks > 0 ? (cConversions.length / cClicks) * 100 : 0;
    return {
      id: c.id, name: c.name, status: c.status,
      trafficSource: c.trafficSource?.name ?? c.source ?? '—',
      clicks: cClicks, conversions: cConversions.length,
      revenue: Math.round(cRevenue * 100) / 100,
      cost: Math.round(cCost * 100) / 100,
      profit: Math.round(cProfit * 100) / 100,
      roi: cROI !== null ? Math.round(cROI * 100) / 100 : null,
      cr: Math.round(cCR * 100) / 100,
    };
  });

  // ── Details: Countries ──────────────────────────────────────────────────────
  const countryClickMap = new Map<string, { country: string; clicks: number; suspicious: number }>();
  for (const click of clicks) {
    const key = click.countryCode ?? 'UNKNOWN';
    const ex = countryClickMap.get(key) ?? { country: click.country ?? 'Unknown', clicks: 0, suspicious: 0 };
    ex.clicks++;
    if (click.isSuspicious) ex.suspicious++;
    countryClickMap.set(key, ex);
  }
  const countryConvMap = new Map<string, { conversions: number; revenue: number }>();
  for (const conv of conversions) {
    const key = conv.click?.countryCode ?? 'UNKNOWN';
    const ex = countryConvMap.get(key) ?? { conversions: 0, revenue: 0 };
    ex.conversions++; ex.revenue += conv.value;
    countryConvMap.set(key, ex);
  }
  const countryDetails = Array.from(countryClickMap.entries()).map(([code, c]) => {
    const convData = countryConvMap.get(code) ?? { conversions: 0, revenue: 0 };
    const suspRate = c.clicks > 0 ? Math.round((c.suspicious / c.clicks) * 100 * 10) / 10 : 0;
    return {
      countryCode: code, country: c.country,
      clicks: c.clicks, conversions: convData.conversions,
      revenue: Math.round(convData.revenue * 100) / 100,
      profit: Math.round(convData.revenue * 100) / 100,
      cr: c.clicks > 0 ? Math.round((convData.conversions / c.clicks) * 100 * 100) / 100 : 0,
      suspiciousRate: suspRate,
    };
  }).sort((a, b) => b.clicks - a.clicks).slice(0, 20);

  // ── Details: Traffic Sources ────────────────────────────────────────────────
  const sourceClickMap = new Map<string, { clicks: number; suspicious: number }>();
  for (const click of clicks) {
    const key = click.utmSource ?? '(direct)';
    const ex = sourceClickMap.get(key) ?? { clicks: 0, suspicious: 0 };
    ex.clicks++;
    if (click.isSuspicious) ex.suspicious++;
    sourceClickMap.set(key, ex);
  }
  const sourceConvMap = new Map<string, { conversions: number; revenue: number }>();
  for (const conv of conversions) {
    const key = conv.click?.utmSource ?? '(direct)';
    const ex = sourceConvMap.get(key) ?? { conversions: 0, revenue: 0 };
    ex.conversions++; ex.revenue += conv.value;
    sourceConvMap.set(key, ex);
  }
  const sourceDetails = Array.from(sourceClickMap.entries()).map(([source, c]) => {
    const convData = sourceConvMap.get(source) ?? { conversions: 0, revenue: 0 };
    return {
      source, clicks: c.clicks, conversions: convData.conversions,
      revenue: Math.round(convData.revenue * 100) / 100,
      profit: Math.round(convData.revenue * 100) / 100,
      cr: c.clicks > 0 ? Math.round((convData.conversions / c.clicks) * 100 * 100) / 100 : 0,
      suspiciousRate: c.clicks > 0 ? Math.round((c.suspicious / c.clicks) * 100 * 10) / 10 : 0,
    };
  }).sort((a, b) => b.clicks - a.clicks).slice(0, 20);

  // ── Details: Devices ────────────────────────────────────────────────────────
  const deviceMap = new Map<string, { clicks: number }>();
  for (const click of clicks) {
    const key = click.device ?? 'Unknown';
    const ex = deviceMap.get(key) ?? { clicks: 0 };
    ex.clicks++;
    deviceMap.set(key, ex);
  }
  const deviceConvMap = new Map<string, { conversions: number; revenue: number }>();
  for (const conv of conversions) {
    const key = conv.click?.device ?? 'Unknown';
    const ex = deviceConvMap.get(key) ?? { conversions: 0, revenue: 0 };
    ex.conversions++; ex.revenue += conv.value;
    deviceConvMap.set(key, ex);
  }
  const deviceDetails = Array.from(deviceMap.entries()).map(([device, c]) => {
    const convData = deviceConvMap.get(device) ?? { conversions: 0, revenue: 0 };
    return {
      device, clicks: c.clicks, conversions: convData.conversions,
      revenue: Math.round(convData.revenue * 100) / 100,
      profit: Math.round(convData.revenue * 100) / 100,
      cr: c.clicks > 0 ? Math.round((convData.conversions / c.clicks) * 100 * 100) / 100 : 0,
    };
  }).sort((a, b) => b.clicks - a.clicks);

  // ── Details: OS ─────────────────────────────────────────────────────────────
  const osMap = new Map<string, { clicks: number }>();
  for (const click of clicks) {
    const key = click.os ?? 'Unknown';
    const ex = osMap.get(key) ?? { clicks: 0 };
    ex.clicks++;
    osMap.set(key, ex);
  }
  const osConvMap = new Map<string, { conversions: number; revenue: number }>();
  for (const conv of conversions) {
    const key = conv.click?.os ?? 'Unknown';
    const ex = osConvMap.get(key) ?? { conversions: 0, revenue: 0 };
    ex.conversions++; ex.revenue += conv.value;
    osConvMap.set(key, ex);
  }
  const osDetails = Array.from(osMap.entries()).map(([os, c]) => {
    const convData = osConvMap.get(os) ?? { conversions: 0, revenue: 0 };
    return {
      os, clicks: c.clicks, conversions: convData.conversions,
      revenue: Math.round(convData.revenue * 100) / 100,
      profit: Math.round(convData.revenue * 100) / 100,
      cr: c.clicks > 0 ? Math.round((convData.conversions / c.clicks) * 100 * 100) / 100 : 0,
    };
  }).sort((a, b) => b.clicks - a.clicks);

  // ── Details: Browsers ───────────────────────────────────────────────────────
  const browserMap = new Map<string, { clicks: number }>();
  for (const click of clicks) {
    const key = click.browser ?? 'Unknown';
    const ex = browserMap.get(key) ?? { clicks: 0 };
    ex.clicks++;
    browserMap.set(key, ex);
  }
  const browserDetails = Array.from(browserMap.entries()).map(([browser, c]) => ({
    browser, clicks: c.clicks, conversions: 0, revenue: 0, profit: 0, cr: 0,
  })).sort((a, b) => b.clicks - a.clicks);

  res.json({
    overview: {
      visits: uniqueVisitors,
      clicks: totalClicks,
      conversions: totalConversions,
      revenue: Math.round(revenue * 100) / 100,
      cost: Math.round(totalCost * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      roi: roi !== null ? Math.round(roi * 100) / 100 : null,
      roas: roas !== null ? Math.round(roas * 100) / 100 : null,
      cr: Math.round(cr * 100) / 100,
      suspiciousClicks,
      suspiciousRate,
    },
    changes: {
      clicks: pctChange(totalClicks, prevClicks),
      conversions: pctChange(totalConversions, prevConversions._count),
      revenue: pctChange(revenue, prevRevenue),
    },
    timeline,
    details: {
      campaigns: campaignDetails,
      countries: countryDetails,
      sources: sourceDetails,
      devices: deviceDetails,
      os: osDetails,
      browsers: browserDetails,
    },
  });
});

// ── GET /api/analytics/export ────────────────────────────────────────────────
router.get('/export', async (req: AuthRequest, res: Response): Promise<void> => {
  const teamIds = await getTeamUserIds(req.user!.id);
  const { start, end } = parseDateRange(req.query as Record<string, string>);
  const type = (req.query.type as string) ?? 'clicks';

  if (type === 'clicks') {
    const clicks = await prisma.click.findMany({
      where: { userId: { in: teamIds }, isBot: false, timestamp: { gte: start, lte: end } },
      select: {
        id: true, timestamp: true, country: true, device: true, os: true, browser: true,
        utmSource: true, utmMedium: true, utmCampaign: true, isSuspicious: true, ip: true,
        link: { select: { name: true, slug: true } },
        campaign: { select: { name: true } },
      },
      orderBy: { timestamp: 'desc' },
    });
    const headers = ['Date','Time','Link','Campaign','Country','Device','OS','Browser','Source','Medium','UTM Campaign','Suspicious','IP'];
    const rows = clicks.map((c) => [
      c.timestamp.toISOString().slice(0,10),
      c.timestamp.toISOString().slice(11,19),
      c.link?.name ?? '', c.campaign?.name ?? '',
      c.country ?? '', c.device ?? '', c.os ?? '', c.browser ?? '',
      c.utmSource ?? '', c.utmMedium ?? '', c.utmCampaign ?? '',
      c.isSuspicious ? 'Yes' : 'No', c.ip ?? '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="clicks-${start.toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } else if (type === 'conversions') {
    const conversions = await prisma.conversion.findMany({
      where: { userId: { in: teamIds }, timestamp: { gte: start, lte: end } },
      select: {
        id: true, timestamp: true, type: true, value: true, currency: true,
        link: { select: { name: true } },
        click: { select: { country: true, device: true, utmSource: true } },
      },
      orderBy: { timestamp: 'desc' },
    });
    const headers = ['Date','Time','Link','Type','Value','Currency','Country','Device','Source'];
    const rows = conversions.map((c) => [
      c.timestamp.toISOString().slice(0,10),
      c.timestamp.toISOString().slice(11,19),
      c.link?.name ?? '', c.type, c.value, c.currency,
      c.click?.country ?? '', c.click?.device ?? '', c.click?.utmSource ?? '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="conversions-${start.toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } else {
    res.status(400).json({ error: 'Invalid type. Use: clicks, conversions' });
  }
});

// ── Legacy endpoints (backward compat) ──────────────────────────────────────
router.get('/overview', async (req: AuthRequest, res: Response): Promise<void> => {
  const teamIds = await getTeamUserIds(req.user!.id);
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30*24*60*60*1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60*24*60*60*1000);
  const [totalClicks, botClicks, totalConversions, conversionValues, prevClicks, prevConversions, prevValues] = await Promise.all([
    prisma.click.count({ where: { userId: { in: teamIds }, isBot: false, timestamp: { gte: thirtyDaysAgo } } }),
    prisma.click.count({ where: { userId: { in: teamIds }, isBot: true, timestamp: { gte: thirtyDaysAgo } } }),
    prisma.conversion.count({ where: { userId: { in: teamIds }, timestamp: { gte: thirtyDaysAgo } } }),
    prisma.conversion.findMany({ where: { userId: { in: teamIds }, timestamp: { gte: thirtyDaysAgo } }, select: { value: true } }),
    prisma.click.count({ where: { userId: { in: teamIds }, isBot: false, timestamp: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    prisma.conversion.count({ where: { userId: { in: teamIds }, timestamp: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    prisma.conversion.findMany({ where: { userId: { in: teamIds }, timestamp: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } }, select: { value: true } }),
  ]);
  const uniqueVisitorsResult = await prisma.click.groupBy({ by: ['visitorId'], where: { userId: { in: teamIds }, isBot: false, timestamp: { gte: thirtyDaysAgo } } });
  const revenue = conversionValues.reduce((s, c) => s + c.value, 0);
  const prevRevenue = prevValues.reduce((s, c) => s + c.value, 0);
  const totalSpend = await prisma.campaign.aggregate({ where: { userId: { in: teamIds } }, _sum: { cost: true } }).then((r) => r._sum.cost ?? 0);
  const totalAllClicks = totalClicks + botClicks;
  const botRate = totalAllClicks > 0 ? Math.round((botClicks / totalAllClicks) * 100 * 10) / 10 : 0;
  const insights = await generateInsights(teamIds);
  res.json({
    overview: { totalClicks, uniqueVisitors: uniqueVisitorsResult.length, totalConversions, revenue: Math.round(revenue*100)/100, avgCPA: totalConversions>0&&totalSpend>0?Math.round((totalSpend/totalConversions)*100)/100:null, avgROAS: totalSpend>0&&revenue>0?Math.round((revenue/totalSpend)*100)/100:null, botRate, botClicks },
    changes: { clicks: pctChange(totalClicks, prevClicks), conversions: pctChange(totalConversions, prevConversions), revenue: pctChange(revenue, prevRevenue) },
    insights,
  });
});

router.get('/timeline', async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = z.object({ days: z.string().optional().transform((v) => v ? parseInt(v,10) : 30).pipe(z.number().min(1).max(90)) }).safeParse(req.query);
  if (!parse.success) { res.status(400).json({ error: 'Invalid days parameter' }); return; }
  const { days } = parse.data;
  const teamIds = await getTeamUserIds(req.user!.id);
  const now = new Date();
  const start = new Date(now.getTime() - days*24*60*60*1000);
  const [clicks, conversions] = await Promise.all([
    prisma.click.findMany({ where: { userId: { in: teamIds }, isBot: false, timestamp: { gte: start } }, select: { timestamp: true, visitorId: true } }),
    prisma.conversion.findMany({ where: { userId: { in: teamIds }, timestamp: { gte: start } }, select: { timestamp: true, value: true } }),
  ]);
  const clickMap=new Map<string,number>(), uniqueMap=new Map<string,Set<string>>(), convMap=new Map<string,number>(), revenueMap=new Map<string,number>();
  for (const click of clicks) {
    const key=click.timestamp.toISOString().slice(0,10);
    clickMap.set(key,(clickMap.get(key)??0)+1);
    if(!uniqueMap.has(key))uniqueMap.set(key,new Set());
    uniqueMap.get(key)!.add(click.visitorId);
  }
  for (const conv of conversions) {
    const key=conv.timestamp.toISOString().slice(0,10);
    convMap.set(key,(convMap.get(key)??0)+1);
    revenueMap.set(key,(revenueMap.get(key)??0)+conv.value);
  }
  const timeline=[];
  for(let i=days-1;i>=0;i--){
    const d=new Date(now.getTime()-i*24*60*60*1000);
    const key=d.toISOString().slice(0,10);
    timeline.push({date:key,clicks:clickMap.get(key)??0,uniqueVisitors:uniqueMap.get(key)?.size??0,conversions:convMap.get(key)??0,revenue:Math.round((revenueMap.get(key)??0)*100)/100});
  }
  res.json({ timeline });
});

router.get('/by-campaign', async (req: AuthRequest, res: Response): Promise<void> => {
  const teamIds = await getTeamUserIds(req.user!.id);
  const campaigns = await prisma.campaign.findMany({
    where: { userId: { in: teamIds } },
    include: { _count: { select: { clicks: true } }, links: { include: { conversions: { select: { value: true, type: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  const result = campaigns.map((c) => {
    const totalClicks=c._count.clicks, allConversions=c.links.flatMap((l)=>l.conversions), totalConversions=allConversions.length;
    const revenue=allConversions.reduce((s,cv)=>s+cv.value,0), cost=c.cost??0, profit=revenue-cost;
    const roas=cost>0&&revenue>0?revenue/cost:null, cpa=totalConversions>0&&cost>0?cost/totalConversions:null, cr=totalClicks>0?(totalConversions/totalClicks)*100:0;
    return { id:c.id, name:c.name, status:c.status, budget:c.budget, cost, revenue:Math.round(revenue*100)/100, profit:Math.round(profit*100)/100, roas:roas!==null?Math.round(roas*100)/100:null, cpa:cpa!==null?Math.round(cpa*100)/100:null, conversionRate:Math.round(cr*100)/100, totalClicks, totalConversions };
  });
  res.json({ campaigns: result });
});

router.get('/top-countries', async (req: AuthRequest, res: Response): Promise<void> => {
  const teamIds = await getTeamUserIds(req.user!.id);
  const grouped = await prisma.click.groupBy({ by: ['countryCode','country'], where: { userId: { in: teamIds }, isBot: false }, _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 10 });
  res.json({ countries: grouped.map((g) => ({ countryCode: g.countryCode, country: g.country, clicks: g._count.id })) });
});

router.get('/devices', async (req: AuthRequest, res: Response): Promise<void> => {
  const teamIds = await getTeamUserIds(req.user!.id);
  const grouped = await prisma.click.groupBy({ by: ['device'], where: { userId: { in: teamIds }, isBot: false }, _count: { id: true }, orderBy: { _count: { id: 'desc' } } });
  const total = grouped.reduce((s, g) => s + g._count.id, 0);
  res.json({ devices: grouped.map((g) => ({ device: g.device??'unknown', clicks: g._count.id, percentage: total>0?Math.round((g._count.id/total)*100*10)/10:0 })), total });
});

router.get('/recent-clicks', async (req: AuthRequest, res: Response): Promise<void> => {
  const teamIds = await getTeamUserIds(req.user!.id);
  const limit  = Math.min(parseInt(String(req.query.limit  ?? '50'), 10), 200);
  const offset = Math.max(parseInt(String(req.query.offset ?? '0'),  10), 0);
  const campaignId  = req.query.campaignId  ? String(req.query.campaignId)  : undefined;
  const linkId      = req.query.linkId      ? String(req.query.linkId)      : undefined;
  const country     = req.query.country     ? String(req.query.country)     : undefined;
  const device      = req.query.device      ? String(req.query.device)      : undefined;
  const isBot       = req.query.isBot === 'true' ? true : req.query.isBot === 'false' ? false : undefined;
  const isUnique    = req.query.isUnique === 'true' ? true : req.query.isUnique === 'false' ? false : undefined;
  const search      = req.query.search ? String(req.query.search) : undefined;
  const { start, end } = parseDateRange(req.query as Record<string, string>);

  const where: Record<string, unknown> = {
    userId: { in: teamIds },
    timestamp: { gte: start, lte: end },
    ...(campaignId && { campaignId }),
    ...(linkId     && { linkId }),
    ...(country    && { country: { contains: country, mode: 'insensitive' } }),
    ...(device     && { device }),
    ...(isBot      !== undefined && { isBot }),
    ...(isUnique   !== undefined && { isUnique }),
    ...(search && {
      OR: [
        { ip:        { contains: search } },
        { visitorId: { contains: search } },
        { utmSource: { contains: search, mode: 'insensitive' } },
        { fbclid:    { contains: search } },
      ],
    }),
  };

  const [clicks, total] = await Promise.all([
    prisma.click.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
      include: {
        link:     { select: { name: true, slug: true } },
        campaign: { select: { name: true } },
        conversions: { select: { id: true, type: true, value: true } },
      },
    }),
    prisma.click.count({ where }),
  ]);

  res.json({ clicks, total, limit, offset });
});

router.get('/insights', async (req: AuthRequest, res: Response): Promise<void> => {
  const teamIds = await getTeamUserIds(req.user!.id);
  const insights = await generateInsights(teamIds);
  res.json({ insights });
});

export default router;
