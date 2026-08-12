# Adflow — Ad Management & Tracking Platform

Adflow is a campaign tracking and management platform for performance marketing — built to give media buyers a single dashboard for campaigns, traffic sources, landers, offers, and conversions instead of stitching together spreadsheets and multiple tools.

🌐 [adflow.digitaladexpert.de](https://adflow.digitaladexpert.de)

## Features

- **Campaign management** — create and organize campaigns across multiple traffic sources
- **Link tracking** — trackable links with click-level attribution
- **Landers & offers** — manage landing pages and offers independently, mix and match per campaign
- **Conversion tracking** — server-side conversion recording tied back to the originating click
- **Analytics dashboard** — performance breakdowns by campaign, traffic source, and time period
- **Alerts** — automated notifications on campaign performance thresholds
- **Admin panel** — user and account management

## Architecture

Monorepo with two apps sharing one Postgres database via Prisma:

```
apps/
  api/   Express + Prisma REST API — auth, campaigns, tracking, analytics, alerts
  web/   Next.js 15 dashboard (React 18)
```

**Stack:** TypeScript · Next.js · React · Express · Prisma · PostgreSQL · JWT auth

## Development

```bash
npm install
npm run dev:api    # API on :6000
npm run dev:web    # Dashboard on :3020
```

## License

Proprietary — © Digital Ad Expert
