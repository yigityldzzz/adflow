# AdFlow — CLAUDE.md

Ad-tracking / analytics platform: click tracking, conversion pixels,
multi-condition flow rules, bot blocking, Meta/TikTok/Snapchat Conversions
API integrations. Part of the Digital Ad Expert product portfolio (sibling
products: FlowKit, StyleKit).

## Layout (npm workspaces monorepo)

- `apps/api` — Express + Prisma backend. Rate-limited, helmet-hardened,
  JWT auth, geoip + UA parsing for traffic rules. `prisma/` has the schema —
  run `db:generate`/`db:migrate`/`db:push` from `apps/api` after any schema
  change, don't hand-edit the DB.
- `apps/web` — Next.js dashboard (App Router).
- `deploy.sh`, `ecosystem.config.js` — PM2 deploy config, already wired to
  the VPS layout below.

## Where this actually runs

- **VPS**: `76.13.13.118`, checked out at `/root/adflow`, PM2-managed:
  `adflow-api` (port **6000**), `adflow-web` (Next.js, port **3020**).
- **nginx**: `/etc/nginx/sites-available/adflow`, domain
  `adflow.digitaladexpert.de`. `/api/`, `/r/` (click redirects), `/health`,
  `/api/conversions/pixel/` → `127.0.0.1:6000`; everything else →
  `127.0.0.1:3020`.
- **Deploy**: `git pull` on the VPS, `npm run build` (builds both
  workspaces), `pm2 restart adflow-api adflow-web`. Both are real git
  clones connected to `origin` (github.com/yigityldzzz/adflow) — pushing to
  `main` and pulling on the VPS is the whole deploy loop, no extra packaging
  step like FlowKit/StyleKit's browser extensions need.
- **Database**: Postgres, database `adflowdb`. Credentials are in
  `~/Desktop/DIGITAL AD EXPERT/Sifreler-ve-Erisim-Bilgileri.txt` on the
  operator's Mac — do not hardcode them into code or nginx config; use
  `apps/api`'s existing env-var loading.
- Before touching Prisma migrations against production, there's a
  `/root/backups/` convention on the VPS of `pg_dump`-ing to a timestamped
  file first (e.g. `adflowdb_pre_phase4_5_...dump`) — keep doing that for
  any schema change.

## Custom domains

There's a `scripts/add-custom-domain.sh` for AdFlow's "bring your own
tracking domain" feature (Team/Org plan tier) — check it before
hand-editing nginx for a customer's custom domain.
