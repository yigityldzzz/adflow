import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { errorHandler } from './middleware/errorHandler';
import authRouter from './routes/auth';
import campaignsRouter from './routes/campaigns';
import linksRouter from './routes/links';
import analyticsRouter from './routes/analytics';
import conversionsRouter from './routes/conversions';
import alertsRouter from './routes/alerts';
import adminRouter from './routes/admin';
import trafficSourcesRouter from './routes/traffic-sources';
import offersRouter from './routes/offers';
import landersRouter from './routes/landers';
import flowsRouter from './routes/flows';
import notificationsRouter from './routes/notifications';
import organizationsRouter from './routes/organizations';
import domainsRouter from './routes/domains';
import adAccountsRouter from './routes/adAccounts';
import redirectRouter from './tracking/redirect';
import { checkAllAlerts } from './services/alertChecker';
import { enforceDataRetention } from './services/retention';
import { syncAllMetaAdAccounts } from './services/adAccountScheduler';

const app = express();
const PORT = parseInt(process.env.PORT ?? '6000', 10);

// ── Security & Compression ────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  })
);

app.use(
  cors({
    origin: [
      'https://adflow.digitaladexpert.de',
      'http://localhost:3020',
      'http://127.0.0.1:3020',
    ],
    credentials: true,
  })
);

app.use(compression());

// ── Logging ───────────────────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// ── Trust proxy (Cloudflare / nginx) ─────────────────────────────────────────
app.set('trust proxy', 1);

// ── Rate Limiters ─────────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later.' },
});

// ── Routes ────────────────────────────────────────────────────────────────────

// Tracking redirect — no rate limit, no auth
app.use('/r', redirectRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true, version: '1.0.0' });
});

// Auth (stricter rate limit)
app.use('/api/auth', authLimiter, authRouter);

// Protected API routes (general rate limit)
app.use('/api/campaigns', generalLimiter, campaignsRouter);
app.use('/api/links', generalLimiter, linksRouter);
app.use('/api/analytics', generalLimiter, analyticsRouter);
app.use('/api/conversions', generalLimiter, conversionsRouter);
app.use('/api/alerts', generalLimiter, alertsRouter);
app.use('/api/admin', generalLimiter, adminRouter);
app.use('/api/traffic-sources', generalLimiter, trafficSourcesRouter);
app.use('/api/offers', generalLimiter, offersRouter);
app.use('/api/landers', generalLimiter, landersRouter);
app.use('/api/flows', generalLimiter, flowsRouter);
app.use('/api/notifications', generalLimiter, notificationsRouter);
app.use('/api/organizations', generalLimiter, organizationsRouter);
app.use('/api/domains', generalLimiter, domainsRouter);
app.use('/api/ad-accounts', generalLimiter, adAccountsRouter);

// ── Error Handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`AdFlow API listening on port ${PORT}`);
});

// Run alert checks every 5 minutes
setInterval(() => {
  checkAllAlerts().catch((e) => console.error('[AlertChecker]', e));
}, 5 * 60 * 1000);

// Enforce per-plan data retention once a day. Also run shortly after startup
// (not immediately, to avoid competing with app boot) so a freshly deployed
// server doesn't wait a full 24h before the first cleanup pass.
setTimeout(() => {
  enforceDataRetention().catch((e) => console.error('[Retention]', e));
}, 2 * 60 * 1000);
setInterval(() => {
  enforceDataRetention().catch((e) => console.error('[Retention]', e));
}, 24 * 60 * 60 * 1000);

// Sync connected Meta ad account spend into linked campaigns every 6 hours.
// No-op if no accounts are connected yet.
setTimeout(() => {
  syncAllMetaAdAccounts().catch((e) => console.error('[AdAccountSync]', e));
}, 3 * 60 * 1000);
setInterval(() => {
  syncAllMetaAdAccounts().catch((e) => console.error('[AdAccountSync]', e));
}, 6 * 60 * 60 * 1000);

export default app;
